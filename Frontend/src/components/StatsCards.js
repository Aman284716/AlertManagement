// src/components/StatsCards.js
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Grid,
  Avatar,
  Divider
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SpeedIcon from "@mui/icons-material/Speed";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import TimerIcon from "@mui/icons-material/Timer";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const StatsCards = ({ onProcessAlerts, loading, alertCount, avgProcessingTime, stats }) => {
  // Calculate accuracy rate from stats
  const calculateAccuracyRate = () => {
    if (!stats || !stats.outcomes) return 85; // default
    
    const totalInvestigations = stats.total_investigations || 0;
    const truePositives = stats.true_positives || 0;
    const falsePositives = stats.false_positives || 0;
    
    if (totalInvestigations === 0) return 85;
    
    // Calculate accuracy as (correct predictions) / (total predictions)
    const accuracy = ((truePositives) / totalInvestigations) * 100;
    return Math.round(accuracy);
  };

  const accuracyRate = calculateAccuracyRate();
  const totalProcessed = stats.total_investigations || 0;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  bgcolor: "primary.main",
                  width: 48,
                  height: 48
                }}
              >
                <SmartToyIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Alert Processing
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "text.secondary",
                    fontWeight: 500
                  }}
                >
                  Process pending alerts using GenAI agents
                </Typography>
              </Box>
            </Box>
            
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 3,
                color: "text.secondary",
                lineHeight: 1.6
              }}
            >
              Leverage advanced machine learning algorithms to automatically analyze and classify security alerts with high accuracy.
            </Typography>
            
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <PlayArrowIcon />}
              onClick={onProcessAlerts}
              disabled={loading}
              fullWidth
              sx={{ 
                py: 1.5,
                fontWeight: 600,
                fontSize: "1rem"
              }}
            >
              {loading ? "Processing Alerts..." : "Process Pending Alerts"}
            </Button>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card sx={{ height: "100%" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  bgcolor: "secondary.main",
                  width: 48,
                  height: 48
                }}
              >
                <AnalyticsIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Performance Metrics
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: "text.secondary",
                    fontWeight: 500
                  }}
                >
                  Real-time system performance indicators
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2} justifyContent={"center"}>
              <Grid item xs={4}>
                <Box textAlign="center" sx={{ p: 2, bgcolor: "rgba(0, 102, 102, 0.05)", border: "1px solid #e0e0e0" }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                    {alertCount > 0 ? alertCount : totalProcessed}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    {alertCount > 0 ? "Currently Processing" : "Total Processed"}
                  </Typography>
                </Box>
              </Grid>
              {/* <Grid item xs={4}>
                <Box textAlign="center" sx={{ p: 2, bgcolor: "rgba(0, 0, 0, 0.05)", border: "1px solid #e0e0e0" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                    <TimerIcon sx={{ mr: 0.5, color: "secondary.main" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "secondary.main" }}>
                      {avgProcessingTime}s
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Avg Processing Time
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box textAlign="center" sx={{ p: 2, bgcolor: "rgba(36, 161, 72, 0.05)", border: "1px solid #e0e0e0" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 0.5 }}>
                    <CheckCircleIcon sx={{ mr: 0.5, color: "success.main" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                      {accuracyRate}%
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Accuracy Rate
                  </Typography>
                </Box>
              </Grid> */}
            </Grid> 
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                System Status
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    bgcolor: loading ? "warning.main" : "success.main", 
                    mr: 1,
                    borderRadius: "50%"
                  }} 
                />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: 600, 
                    color: loading ? "warning.main" : "success.main"
                  }}
                >
                  {loading ? "Processing" : "Operational"}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default StatsCards;
