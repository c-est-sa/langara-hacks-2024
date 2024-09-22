import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuIcon from "@mui/icons-material/Menu";
 import CallEndIcon from "@mui/icons-material/CallEnd";
import PermPhoneMsgIcon from "@mui/icons-material/PermPhoneMsg";
import PersonIcon from "@mui/icons-material/Person";
import { Typography } from "@mui/material";

export default function Header(props) {
  // eslint-disable-next-line react/prop-types
  const { navigate, getCurrentPath } = props;
  const [open, setOpen] = React.useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setOpen(false);
  };
  const clearHistory = async () => {
    // Backend: clear the chat history
    const res = await axios.post("http://localhost:3000/api/chat/end-call", {
      userId: "1",
    });

    // Frontend: clear the messages
    setMessages([]);
    console.log(res.data);
  };


  const DrawerList = (
    <Box
      sx={{ width: 250, zIndex: 100 }}
      role="presentation"
      onClick={toggleDrawer(false)}
    >
      <List>
        {[
          {
            text: "Easy Talk",
            icon: <PermPhoneMsgIcon />,
            path: "/chat",
          },
          { text: "Profile", icon: <PersonIcon />, path: "/profile" },
        ].map(({ text, icon, path }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton onClick={() => handleNavigation(path)}>
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          margin: "0 auto",
          maxWidth: "900px",
          width: "100vw",
          backgroundColor: "#F7F7F7",
          height: "60px",
          zIndex: 999,
        }}
      >
        <Button
          onClick={toggleDrawer(true)}
          sx={{ position: "absolute", top: 0, left: 0, height: "100%" }}
        >
          <MenuIcon />
        </Button>
        <img
  src="src/assets/logo-title.png" 
  alt="Easy Talk Logo"
  style={{ height: "60px", lineHeight: "60px" }} 
/>
        <Button
        variant="contained"
        endIcon={<CallEndIcon />}
        onClick={clearHistory}
        sx={{ position: "absolute", top: 10, right: 10, height: "70%" }}
        >
        clear history
      </Button>
      </header>
      <Drawer open={open} onClose={toggleDrawer(false)}>
        {DrawerList}
      </Drawer>
    </>
  );
}
