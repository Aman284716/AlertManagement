// src/App.js
import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

// Carbon Design System Inspired Theme - Sharp Edges, Functional Colors
const carbonTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: "#006666", // Teal 700
      dark: "#004d4d",
      light: "#009999",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#000000", // Black
      dark: "#000000",
      light: "#333333",
      contrastText: "#ffffff"
    },
    background: {
      default: "#ffffff", // White
      paper: "#ffffff"
    },
    text: {
      primary: "#000000", // Black
      secondary: "#666666" // Gray
    },
    success: {
      main: "#24a148", // Green for success states
      dark: "#1e7e34",
      light: "#42be65"
    },
    error: {
      main: "#da1e28", // Red for error states
      dark: "#a71e34",
      light: "#ff8389"
    },
    warning: {
      main: "#f1c21b", // Yellow for warning states
      dark: "#d97700",
      light: "#f4c785"
    },
    info: {
      main: "#006666", // Teal 700
      dark: "#004d4d",
      light: "#009999"
    },
    divider: "#e0e0e0" // Light gray
  },
  typography: {
    fontFamily: '"Microsoft Aptos", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em'
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em'
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.3
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.4
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.025em'
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4
    }
  },
  shape: {
    borderRadius: 0 // Sharp edges
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@font-face': {
          fontFamily: 'Microsoft Aptos',
          src: 'url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap")'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp edges
          boxShadow: 'none', // No shadows
          border: '1px solid #e0e0e0',
          '&:hover': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp edges
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
          minHeight: '40px',
          '&:hover': {
            transform: 'none',
            boxShadow: 'none'
          }
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px'
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp edges
          fontWeight: 500,
          fontSize: '0.75rem'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8f9fa'
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          fontSize: '0.875rem',
          color: '#000000'
        },
        body: {
          fontSize: '0.875rem'
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 0, // Sharp edges
          backgroundColor: '#e0e0e0'
        },
        bar: {
          borderRadius: 0 // Sharp edges
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0, // Sharp edges
          boxShadow: 'none' // No shadows
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none' // No shadows
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0 // Sharp edges
        }
      }
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: 0 // Sharp edges
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          borderRadius: 0 // Sharp edges
        }
      }
    }
  }
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (success) => {
    setIsAuthenticated(success);
  };

  return (
    <ThemeProvider theme={carbonTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Default route redirects to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Login route */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          
          {/* Dashboard route - protected */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
