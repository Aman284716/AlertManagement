// src/components/StatsCards.js
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
  Grid,
  Avatar,
  Divider,
  dividerClasses
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import PendingIcon from "@mui/icons-material/Pending";
import ProcessingIcon from "@mui/icons-material/AutoMode";
import ReviewsIcon from "@mui/icons-material/RateReview";

const StatsCards = ({ onProcessAlerts, loading, alertCount, avgProcessingTime, stats }) => {
  const [reviewStats, setReviewStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch review status counts
  const fetchReviewStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/review_status_counts');
      const data = await response.json();
      setReviewStats(data);
    } catch (error) {
      console.error('Error fetching review stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  // Initial load of stats
  useEffect(() => {
    fetchReviewStats();
  }, []);

  // Watch for loading state changes - when processing completes, reload stats
  useEffect(() => {
    let timeoutId;

    if (!loading) {
      // When processing is done, wait a moment then reload stats
      timeoutId = setTimeout(() => {
        fetchReviewStats();
      }, 1000); // 1 second delay to ensure backend is updated
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading]);

  // Optional: Auto-refresh stats every 30 seconds for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!loading) { // Only refresh if not currently processing
        fetchReviewStats();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [loading]);

  // Get counts by review status
  const getCountByStatus = (status) => {
    const statusData = reviewStats.find(item => item.review_status === status);
    console.log(`Status ${status} count:`, statusData ? statusData.count : 0);
    return statusData ? statusData.count : 0;
  };

  // Calculate total alerts
  const getTotalAlerts = () => {
    return reviewStats.reduce((total, item) => total + item.count, 0);
  };

  const pendingAlerts = getCountByStatus(0);
  const processedAlerts = getCountByStatus(1);
  const reviewedAlerts = getCountByStatus(2);
  const totalAlerts = getTotalAlerts();

  // Enhanced process alerts handler with stats refresh
  const handleProcessAlerts = async () => {
    try {
      await onProcessAlerts();
      // After processing completes, refresh stats immediately
      setTimeout(() => {
        fetchReviewStats();
      }, 500);
    } catch (error) {
      console.error('Error processing alerts:', error);
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          width: "100%",
          maxHeight: "300px",
          alignItems: "stretch"
        }}
      >
        {/* Left Card - AI Alert Processing */}
        <Box sx={{ flex: "1 1 50%", minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}> {/* Reduced from mb: 3 */}
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      mr: 2,
                      bgcolor: "primary.main",
                      width: 48,
                      height: 48
                    }}
                  >
                    <SmartToyIcon fontSize="medium" /> {/* Changed from large */}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}> {/* Changed from h5 */}
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

                {/* System Status Indicator */}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
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

              <Typography
                variant="body2" // Changed from body1
                sx={{
                  mb: 2,
                  color: "text.secondary",
                  lineHeight: 1.4
                }}
              >
                Leverage advanced machine learning algorithms to automatically analyze and classify security alerts with high accuracy.
              </Typography>

              {/* Full Width Process Button */}
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} /> : <PlayArrowIcon />}
                onClick={handleProcessAlerts}
                disabled={loading}
                fullWidth
                size="medium"
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: "1rem"
                }}
              >
                {loading ? "Processing Alerts..." : "Process Next 2 Pending Alerts"}
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Right Card - Performance Metrics */}
        <Box sx={{ flex: "1 1 50%", minWidth: 0 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      mr: 2,
                      bgcolor: "secondary.main",
                      width: 40,
                      height: 40
                    }}
                  >
                    <AnalyticsIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}> {/* Changed from h5 */}
                      Performance Metrics
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 500
                      }}
                    >
                      Real-time alert status indicators
                    </Typography>
                  </Box>
                </Box>

                {/* Refresh Indicator */}
                {statsLoading && (
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <CircularProgress size={14} sx={{ mr: 0.5 }} />
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Updating...
                    </Typography>
                  </Box>
                )}
              </Box>

              {statsLoading && reviewStats.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                /* 2x2 Grid for Metrics - ALL TILES NOW UNIFORM */
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gridTemplateRows: "1fr 1fr", // Add this to ensure equal row heights
                    gap: 1.5,
                    height: "140px", // Fixed container height
                    width: "100%" // Ensure full width
                  }}
                >
                  {/* Total Alerts */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row", // Change to row for side-by-side
                      alignItems: "center", // Align vertically
                      justifyContent: "center",
                      p: 1.5,
                      bgcolor: "rgba(0, 102, 102, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(0, 102, 102, 0.2)",
                      opacity: statsLoading ? 0.7 : 1,
                      transition: "opacity 0.3s ease",
                      minHeight: 0,
                      gap: 2 // Add gap between icon and text
                    }}
                  >
                    <AnalyticsIcon sx={{ color: "primary.main", fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main", lineHeight: 1 }}>
                      {totalAlerts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
                      Total Alerts
                    </Typography>
                  </Box>


                  {/* Pending Alerts */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row", // Side-by-side
                      justifyContent: "center",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "rgba(255, 152, 0, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(255, 152, 0, 0.2)",
                      opacity: statsLoading ? 0.7 : 1,
                      transition: "opacity 0.3s ease",
                      minHeight: 0,
                      gap: 2 // Add gap between icon and text
                    }}
                  >
                    <PendingIcon sx={{ color: "warning.main", fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main", lineHeight: 1 }}>
                      {pendingAlerts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
                      Pending
                    </Typography>
                  </Box>

                  {/* Processed Alerts */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "rgba(33, 150, 243, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(33, 150, 243, 0.2)",
                      opacity: statsLoading ? 0.7 : 1,
                      transition: "opacity 0.3s ease",
                      minHeight: 0,
                      gap: 2 // Add gap between icon and text
                    }}
                  >
                    <ProcessingIcon sx={{ color: "info.main", fontSize: 24 }} />

                    <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main", lineHeight: 1 }}>
                      {processedAlerts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
                      Processed
                    </Typography>

                  </Box>

                  {/* Reviewed Alerts */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      p: 1.5,
                      bgcolor: "rgba(76, 175, 80, 0.08)",
                      borderRadius: 2,
                      border: "1px solid rgba(76, 175, 80, 0.2)",
                      opacity: statsLoading ? 0.7 : 1,
                      transition: "opacity 0.3s ease",
                      minHeight: 0,
                      gap: 2 // Add gap between icon and text
                    }}
                  >
                    <ReviewsIcon sx={{ color: "success.main", fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main", lineHeight: 1 }}>
                      {reviewedAlerts}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", fontSize: "0.7rem" }}>
                      Reviewed
                    </Typography>

                  </Box>
                </Box>

              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>

  );

};

export default StatsCards;
