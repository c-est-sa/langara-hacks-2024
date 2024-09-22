const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const { TextToSpeechClient } = require("@google-cloud/text-to-speech");
require("dotenv").config();

// Initialize Google Text-to-Speech client
const ttsClient = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// File paths
const USER_DATA_FILE = path.join(__dirname, "..", "userData.json");
const CHAT_CONTEXT_FILE = path.join(__dirname, "..", "chatContext.json");

// Store active conversations
const activeConversations = new Map();

async function readUserData() {
  try {
    const data = await fs.readFile(USER_DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading user data:", error);
    return null;
  }
}

async function readChatContext() {
  try {
    const data = await fs.readFile(CHAT_CONTEXT_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading chat context:", error);
    return { context: "", historicalChoices: [] };
  }
}

async function writeChatContext(context) {
  try {
    await fs.writeFile(CHAT_CONTEXT_FILE, JSON.stringify(context, null, 2));
  } catch (error) {
    console.error("Error writing chat context:", error);
  }
}

async function generateSuggestions(input, context, user) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = "https://api.openai.com/v1/chat/completions";

  const keywordPrompt = input.keywordInput ? `\nKeyword: ${input.keywordInput}` : "";

  const prompt = `Given the following context:
User Profile: Name: ${user.name} Age: ${user.age}, Location: ${user.location}, Language: ${user.language}
Call Context: ${context}
User Input: ${input.callerInput}${keywordPrompt}

Generate 3 appropriate responses for the user. The responses should be made from the perspective
of the users, tailored for their needs under certain scenarios considering their profile background,
the call context, and the keywordPrompt. 
Each response should be concise, from the user's and easy to articulate.`;

  const postBody = {
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    n: 1,
    temperature: 0.7,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    const response = await axios.post(url, postBody, { headers });
    const content = response.data.choices[0].message.content;

    const suggestions = content
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.replace(/^\d+\.\s*/, "").trim())
      .slice(0, 3);

    return suggestions;
  } catch (error) {
    console.error("Error calling OpenAI API:", error.response ? error.response.data : error.message);
    throw new Error("Failed to generate suggestions from OpenAI");
  }
}

async function textToSpeech(text) {
  const request = {
    input: { text: text },
    voice: { languageCode: "en-US", ssmlGender: "NEUTRAL" },
    audioConfig: { audioEncoding: "MP3" },
  };

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent; // This will return the binary audio content
  } catch (error) {
    console.error("Error generating speech:", error);
    throw new Error("Failed to generate speech");
  }
}

// Input: { userId: string, callerInput: string, keywordInput: string (optional) }
// Output: { suggestions: [string, string, string], disclaimer: string (optional) }
router.post("/process-input", async (req, res) => {
  const { userId, callerInput, keywordInput = "" } = req.body;

  if (!userId || (!callerInput && !keywordInput)) {
    return res.status(400).json({ error: "Missing userId or input" });
  }

  let conversation = activeConversations.get(userId);

  if (!conversation) {
    const userData = await readUserData();
    const chatContext = await readChatContext();

    if (!userData || !userData.users || userData.users.length === 0) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const userProfile = userData.users.find((user) => user.id === userId);

    if (!userProfile) {
      return res.status(404).json({ error: "User profile not found for the given userId" });
    }

    conversation = { userProfile, ...chatContext };
    activeConversations.set(userId, conversation);
  }

  let disclaimer = null;
  let disclaimerAudio = null;

  if (!conversation.context.includes("\nAgent")) {
    disclaimer = generateDisclaimer(conversation.userProfile);
    try {
      disclaimerAudio = await textToSpeech(disclaimer); // Get disclaimer audio
    } catch (error) {
      console.error("Error generating disclaimer audio:", error);
    }
  }

  if (callerInput && callerInput.trim() !== "") {
    conversation.context += `\nCaller: ${callerInput.trim()}`;
    await writeChatContext({
      context: conversation.context,
      historicalChoices: conversation.historicalChoices,
    });
  }

  try {
    const suggestions = await generateSuggestions(
      { userId, callerInput, keywordInput },
      conversation.context,
      conversation.userProfile
    );

    conversation.lastSuggestions = suggestions;
    res.json({ 
      suggestions, 
      disclaimer 
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

// Generate disclaimer text
function generateDisclaimer(userProfile) {
  return `Hello! I'm ${userProfile.name}. I currently have difficulty communicating smoothly.
  I'm using EasyTalk. Thanks for your understanding!`;
}

// Input: { userId: string, chosenSuggestion: string }
// Output: Audio file (MP3 format)
router.post("/choose-suggestion", async (req, res) => {
  const { userId, chosenSuggestion } = req.body;

  if (!userId || !chosenSuggestion) {
    return res.status(400).json({ error: "Missing userId or chosenSuggestion" });
  }

  let conversation = activeConversations.get(userId);

  if (!conversation) {
    return res.status(404).json({ error: "Active conversation not found" });
  }

  conversation.context += `\nAgent: ${chosenSuggestion}`;
  conversation.historicalChoices.push(chosenSuggestion);
  await writeChatContext({
    context: conversation.context,
    historicalChoices: conversation.historicalChoices,
  });

  try {
    // Generate disclaimer audio first
    const disclaimerAudioContent = await textToSpeech(generateDisclaimer(conversation.userProfile));

    // Generate audio for the chosen suggestion
    const suggestionAudioContent = await textToSpeech(chosenSuggestion);

    // Set headers for audio response
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": 'attachment; filename="response.mp3"',
    });

    // Send both audio files in the desired order (disclaimer first)
    res.send(Buffer.concat([
      Buffer.from(disclaimerAudioContent, "binary"),
      Buffer.from(suggestionAudioContent, "binary"),
    ]));
  } catch (error) {
    console.error("Error during Text-to-Speech:", error);
    res.status(500).json({ error: "Failed to convert text to speech" });
  }
});

// Input: { userId: string }
// Output: { message: string }
router.post("/end-call", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  activeConversations.delete(userId);

  try {
    await writeChatContext({ context: "", historicalChoices: [] });
    res.json({ message: "Call ended and context cleared successfully" });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ error: "Failed to end call and clear context" });
  }
});

module.exports = router;
