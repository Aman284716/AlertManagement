import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
  Avatar
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SignalCellularConnectedNoInternet0BarIcon from "@mui/icons-material/SignalCellularConnectedNoInternet0Bar";
import ustLogoRev from "../assets/ust-logo-rev.png";

const Header = () => {
  const [isSystemOnline, setIsSystemOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/health");
        if (!response.ok) throw new Error("API response not OK");

        const data = await response.json();
        if (data.status === "healthy") {
          setIsSystemOnline(true);
        } else {
          setIsSystemOnline(false);
        }
      } catch (error) {
        console.error("Failed to fetch system status:", error);
        setIsSystemOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStatus();

    // Optional: poll every 30 seconds
    const interval = setInterval(fetchSystemStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "#000000",
        borderBottom: "1px solid #e0e0e0"
      }}
    >
      <Toolbar sx={{ minHeight: "80px", py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <Avatar
            src={ustLogoRev}
            sx={{ mr: 2, width: 50, height: 50 }}
          />
          <Box>
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.02em",
                mb: 0.5
              }}
            >
              AlertGuard AI
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.8)",
                fontWeight: 500
              }}
            >
              Intelligent Threat Detection & Response
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Chip
            // icon={
            //   isSystemOnline ? <NotificationsActiveIcon sx={{ color: "white" }}/> : <SignalCellularConnectedNoInternet0BarIcon sx={{ color: "white" }}/>
            // }
            label={
              loading
                ? "Checking..."
                : isSystemOnline
                  ? "System Active"
                  : "System Offline"
            }
            variant="filled"
            sx={{
              color: "white",
              backgroundColor: isSystemOnline ? "#24a148" : "#da1e28",
              fontWeight: 600,
              height: "36px",
              "&:hover": {
                backgroundColor: isSystemOnline ? "#1e7e34" : "#a71e34"
              }
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
