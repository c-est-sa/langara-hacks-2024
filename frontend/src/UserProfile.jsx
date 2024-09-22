import { useEffect, useState } from "react";
import {
  TextField,
  Button,
  // MenuItem,
  // Select,
  // InputLabel,
  // FormControl,
  Box,
  Typography,
} from "@mui/material";
import axios from "axios";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const UserProfile = () => {
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    location: "",
    language: "",
    responses: [],
  });
  const [initialProfile, setInitialProfile] = useState({
    name: "",
    age: "",
    location: "",
    language: "",
  });

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  useEffect(() => {
    (async () => {
      const res = await axios.get(
        "http://localhost:3000/api/chat/user-profile"
      );
      console.log(res.data);
      setProfile({
        ...profile,
        name: res.data.name,
        age: res.data.age,
        location: res.data.location,
        language: res.data.language,
      });
      setInitialProfile({
        ...initialProfile,
        name: res.data.name,
        age: res.data.age,
        location: res.data.location,
        language: res.data.language,
      });
    })();

    console.log(profile, initialProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle input change for profile
  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  const shouldButtonDisabled = () => {
    return (
      isProfileEmpty() ||
      (profile.age === initialProfile.age &&
        profile.name === initialProfile.name &&
        profile.location === initialProfile.location &&
        profile.language === initialProfile.language)
    );
  };

  const isProfileEmpty = () => {
    return !(
      profile.age &&
      profile.name &&
      profile.location &&
      profile.language
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log({
      id: "1",
      name: profile.name,
      age: profile.age,
      location: profile.location,
      language: profile.language,
    });
    try {
      await axios.post("http://localhost:3000/api/chat/user-profile", {
        id: "1",
        name: profile.name,
        age: profile.age,
        location: profile.location,
        language: profile.language,
      });

      setSnackbarMessage("Profile updated successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      clearHistory();
    } catch (error) {
      setSnackbarMessage("Error saving user profile.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      console.error("Error saving user profile:", error);
    }

    setInitialProfile({
      ...initialProfile,
      name: profile.name,
      age: profile.age,
      location: profile.location,
      language: profile.language,
    });
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const clearHistory = async () => {
    // Backend: clear the chat history
    const res = await axios.post("http://localhost:3000/api/chat/end-call", {
      userId: "1",
    });

    console.log(res.data);
  };

  return (
    <Box sx={{ width: "400px", margin: "auto", padding: "80px" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextField
          label="Name"
          name="name"
          type="string"
          value={profile.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Age"
          name="age"
          type="number"
          value={profile.age}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        <TextField
          label="Location"
          name="location"
          value={profile.location}
          onChange={handleChange}
          fullWidth
          margin="normal"
          required
        />
        {/* <FormControl fullWidth margin="normal">
          <InputLabel>Preferred Language</InputLabel>
          <Select
            name="language"
            value={profile.language}
            onChange={handleChange}
            required
            defaultValue={profile.language}
            sx={{ textAlign: "left" }}
          >
            <MenuItem value="English">English</MenuItem>
            <MenuItem value="Spanish">Spanish</MenuItem>
            <MenuItem value="French">French</MenuItem>
            <MenuItem value="German">German</MenuItem>
          </Select>
        </FormControl> */}

        <Button
          variant="contained"
          color="primary"
          type="submit"
          sx={{ margin: 2, display: "block" }}
          disabled={shouldButtonDisabled()}
        >
          Save Changes
        </Button>
        <Typography variant="caption" sx={{ color: "gray" }}>
          User profile change will clear current conversation history.
        </Typography>
      </form>

      {/* Snackbar component for success or error messages */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserProfile;
