// src/components/Login.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  Container,
  Alert,
  InputAdornment,
  IconButton
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Security,
  Psychology
} from "@mui/icons-material";
import ustLogo from "../assets/ust-logo.png";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate API call delay
    setTimeout(() => {
      // Dummy credentials check
      if (credentials.username === "admin" && credentials.password === "passme") {
        onLogin(true);
      } else {
        setError("Invalid username or password. Use admin:passme");
      }
      setLoading(false);
    }, 1000);
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Card 
          sx={{ 
            border: "1px solid #e0e0e0",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Logo and Title */}
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Box sx={{ display: "flex", alignItems: "", justifyContent: "center", mb: 2 , padding:"10px"}}>
                <Avatar
                  src={ustLogo}
                  sx={{
                    width: 68,
                    height: 70,
                    mr: 2
                  }}
                />
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: "",
                      letterSpacing: "-0.02em"
                    }}
                  >
                    AlertGuard AI
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 500
                    }}
                  >
                    Intelligent Threat Detection & Response
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <TextField
                fullWidth
                label="Username"
                name="username"
                value={credentials.username}
                onChange={handleInputChange}
                variant="outlined"
                sx={{ mb: 3 }}
                InputProps={{
                  sx: { fontWeight: 500 }
                }}
                InputLabelProps={{
                  sx: { fontWeight: 500 }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={handleInputChange}
                variant="outlined"
                sx={{ mb: 4 }}
                InputProps={{
                  sx: { fontWeight: 500 },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                InputLabelProps={{
                  sx: { fontWeight: 500 }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "1rem"
                }}
                startIcon={loading ? <Psychology /> : <Security />}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login; 