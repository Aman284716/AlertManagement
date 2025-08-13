// src/components/AlertTable.js
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Button,
  Box,
  LinearProgress,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Badge,
  TextField,
  Stack
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SecurityIcon from "@mui/icons-material/Security";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TableChartIcon from "@mui/icons-material/TableChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";
import PendingIcon from "@mui/icons-material/Pending";
import VerifiedIcon from "@mui/icons-material/Verified";
import DateRangeIcon from "@mui/icons-material/DateRange";
import TodayIcon from "@mui/icons-material/Today";
import ClearIcon from "@mui/icons-material/Clear";

// Import dummy data
import investigationOutcomes from "../assets/dummydata/investigation_outcomes.json";

// API configuration
const API_BASE_URL = 'http://localhost:8000';

const getOutcomeConfig = (outcome) => {
  switch (outcome) {
    case "ESCALATE":
      return {
        color: "error",
        icon: <WarningIcon sx={{ fontSize: 16, color: "#da1e28" }} />,
        label: "Escalate",
        bgColor: "rgba(218, 30, 40, 0.1)",
        textColor: "#da1e28"
      };
    case "AUTO_CLOSE":
      return {
        color: "success",
        icon: <CheckCircleIcon sx={{ fontSize: 16, color: "#24a148" }} />,
        label: "Auto Close",
        bgColor: "rgba(36, 161, 72, 0.1)",
        textColor: "#24a148"
      };
    case "HUMAN_REVIEW":
      return {
        color: "warning",
        icon: <SecurityIcon sx={{ fontSize: 16, color: "#d97700" }} />,
        label: "Human Review",
        bgColor: "rgba(241, 194, 27, 0.1)",
        textColor: "#d97700"
      };
    default:
      return {
        color: "default",
        icon: null,
        label: outcome,
        bgColor: "rgba(0, 0, 0, 0.1)",
        textColor: "#000000"
      };
  }
};

const ConfidenceBar = ({ confidence }) => {
  const getColor = (confidence) => {
    if (confidence > 0.7) return "#da1e28";
    if (confidence > 0.4) return "#d97700";
    return "#24a148";
  };

  return (
    <Box sx={{ width: "120px" }}>
      <LinearProgress
        variant="determinate"
        value={confidence * 100}
        sx={{
          height: 8,
          backgroundColor: "#e0e0e0",
          "& .MuiLinearProgress-bar": {
            backgroundColor: getColor(confidence)
          }
        }}
      />
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          display: "block",
          fontWeight: 600,
          color: getColor(confidence)
        }}
      >
        {(confidence * 100).toFixed(1)}%
      </Typography>
    </Box>
  );
};

// Transform API data to match the expected format
const transformApiData = (apiData) => {
  return apiData.map(item => ({
    alert_id: item.alert_id,
    outcome: item.final_outcome,
    outcome_type: item.is_suspicious ? "true_positive" : "false_positive",
    is_suspicious: Boolean(item.is_suspicious),
    confidence: item.confidence_score,
    investigation_summary: item.investigation_summary,
    risk_factors: [], // This might need to be fetched from another endpoint
    loops_executed: 0, // This might need to be fetched from another endpoint
    total_queries: 0, // This might need to be fetched from another endpoint
    agent_outputs: {}, // This might need to be fetched from another endpoint
    outcome_id: item.outcome_id,
    human_verified: Boolean(item.human_verified),
    timestamp: item.timestamp
  }));
};

const AlertTable = ({ onViewAlert }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState(0); // 0 = Under Review, 1 = Reviewed

  // Date filtering states - using string format for HTML date inputs
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL"); // ALL, TODAY, CUSTOM

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to check if a date is today
  const isToday = (date) => {
    const today = new Date();
    const alertDate = new Date(date);
    return alertDate.toDateString() === today.toDateString();
  };

  // Helper function to check if a date is within range
  const isDateInRange = (date, start, end) => {
    const alertDate = new Date(date);
    alertDate.setHours(0, 0, 0, 0); // Reset time for accurate date comparison
    
    const startOfDay = start ? new Date(start + 'T00:00:00') : null;
    const endOfDay = end ? new Date(end + 'T23:59:59') : null;

    if (startOfDay && endOfDay) {
      return alertDate >= startOfDay && alertDate <= endOfDay;
    } else if (startOfDay) {
      return alertDate >= startOfDay;
    } else if (endOfDay) {
      return alertDate <= endOfDay;
    }
    return true;
  };

  // Filter alerts by date
  const filterAlertsByDate = (alertsData) => {
    if (dateFilter === "TODAY") {
      return alertsData.filter(alert => isToday(alert.timestamp));
    } else if (dateFilter === "CUSTOM" && (startDate || endDate)) {
      return alertsData.filter(alert => isDateInRange(alert.timestamp, startDate, endDate));
    }
    return alertsData;
  };

  // Separate alerts based on human verification
  const underReviewAlerts = filterAlertsByDate(alerts.filter(alert => !alert.human_verified));
  const reviewedAlerts = filterAlertsByDate(alerts.filter(alert => alert.human_verified));

  // Get current alerts based on active tab
  const getCurrentAlerts = () => {
    const currentAlerts = activeTab === 0 ? underReviewAlerts : reviewedAlerts;
    return filterAlerts(currentAlerts, outcomeFilter);
  };

  // Get unique outcomes for filter based on current tab
  const getUniqueOutcomes = () => {
    const currentAlerts = activeTab === 0 ? underReviewAlerts : reviewedAlerts;
    const outcomes = [...new Set(currentAlerts.map(alert => alert.outcome))];
    return outcomes;
  };

  // Filter alerts based on outcome
  const filterAlerts = (alertsData, filter) => {
    if (filter === "ALL") {
      return alertsData;
    }
    return alertsData.filter(alert => alert.outcome === filter);
  };

  // Fetch investigation outcomes
  const fetchInvestigationOutcomes = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/investigation_outcomes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const transformedData = transformApiData(data);
      setAlerts(transformedData);
    } catch (error) {
      console.error('Error fetching investigation outcomes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchInvestigationOutcomes();
  }, []);

  // Reset filters when tab changes
  useEffect(() => {
    setOutcomeFilter("ALL");
  }, [activeTab]);

  const handleRefresh = () => {
    fetchInvestigationOutcomes();
  };

  const handleOutcomeFilterChange = (event) => {
    setOutcomeFilter(event.target.value);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDateFilterChange = (event) => {
    const value = event.target.value;
    setDateFilter(value);

    if (value === "TODAY") {
      setStartDate("");
      setEndDate("");
    } else if (value === "ALL") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleClearDateFilters = () => {
    setDateFilter("ALL");
    setStartDate("");
    setEndDate("");
  };

  const handleTodayFilter = () => {
    setDateFilter("TODAY");
    setStartDate("");
    setEndDate("");
  };

  const handleStartDateChange = (event) => {
    const value = event.target.value;
    setStartDate(value);
    if (value && !dateFilter === "CUSTOM") {
      setDateFilter("CUSTOM");
    }
  };

  const handleEndDateChange = (event) => {
    const value = event.target.value;
    setEndDate(value);
    if (value && !dateFilter === "CUSTOM") {
      setDateFilter("CUSTOM");
    }
  };

  const currentAlerts = getCurrentAlerts();
  const uniqueOutcomes = getUniqueOutcomes();

  const renderTableContent = () => (
    <TableContainer component={Paper} sx={{ overflow: "hidden" }}>
      <Table>
        <TableHead>
          <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Alert ID
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Outcome
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Suspicious
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Confidence
            </TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Timestamp
            </TableCell>
            {activeTab === 1 && (
              <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                Status
              </TableCell>
            )}
            <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={activeTab === 1 ? 7 : 6} align="center" sx={{ py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading investigation outcomes...
                </Typography>
              </TableCell>
            </TableRow>
          ) : currentAlerts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={activeTab === 1 ? 7 : 6} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {outcomeFilter === "ALL"
                    ? `No ${activeTab === 0 ? 'under review' : 'reviewed'} alerts found${dateFilter !== "ALL" ? " for the selected date range" : ""}`
                    : `No ${activeTab === 0 ? 'under review' : 'reviewed'} alerts found for ${getOutcomeConfig(outcomeFilter).label}${dateFilter !== "ALL" ? " in the selected date range" : ""}`
                  }
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            currentAlerts.map((alert, index) => {
              const outcomeConfig = getOutcomeConfig(alert.outcome);
              return (
                <TableRow
                  key={alert.outcome_id || alert.alert_id + index}
                  hover
                  sx={{
                    '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                    '&:hover': { backgroundColor: 'rgba(0, 102, 102, 0.05)' }
                  }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 600,
                        color: "primary.main",
                        fontSize: "0.85rem"
                      }}
                    >
                      {alert.alert_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={outcomeConfig.icon}
                      label={outcomeConfig.label}
                      size="small"
                      sx={{
                        backgroundColor: outcomeConfig.bgColor,
                        color: outcomeConfig.textColor,
                        border: `1px solid ${outcomeConfig.textColor}20`,
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={alert.is_suspicious ? "Yes" : "No"}
                      color={alert.is_suspicious ? "error" : "success"}
                      size="small"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <ConfidenceBar confidence={alert.confidence} />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 500, color: "text.secondary" }}
                    >
                      {new Date(alert.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  {activeTab === 1 && (
                    <TableCell>
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: 16 }} />}
                        label="Human Verified"
                        color="success"
                        size="small"
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VisibilityIcon />}
                      onClick={() => onViewAlert(alert)}
                      sx={{
                        fontWeight: 600,
                        borderWidth: "2px",
                        "&:hover": {
                          borderWidth: "2px"
                        }
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center">
            <Avatar
              sx={{
                mr: 2,
                bgcolor: "primary.main",
                width: 48,
                height: 48
              }}
            >
              <TableChartIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Alert Investigation Results
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  fontWeight: 500
                }}
              >
                {activeTab === 0
                  ? `Alerts awaiting human review (${currentAlerts.length} alerts)`
                  : `Human-verified alerts (${currentAlerts.length} alerts)`
                }
                {dateFilter === "TODAY" && " - Today"}
                {dateFilter === "CUSTOM" && (startDate || endDate) && " - Custom Range"}
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <IconButton
              onClick={handleRefresh}
              disabled={loading}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": {
                  bgcolor: "primary.dark"
                },
                "&.Mui-disabled": {
                  bgcolor: "grey.300"
                }
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Box>
        </Box>

        {/* Filter Controls */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
            {/* Outcome Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="outcome-filter-label">
                <Box display="flex" alignItems="center" gap={1}>
                  <FilterListIcon sx={{ fontSize: 16 }} />
                  Filter Outcome
                </Box>
              </InputLabel>
              <Select
                labelId="outcome-filter-label"
                value={outcomeFilter}
                onChange={handleOutcomeFilterChange}
                label="Filter Outcome"
              >
                <MenuItem value="ALL">All Outcomes</MenuItem>
                {uniqueOutcomes.map((outcome) => {
                  const config = getOutcomeConfig(outcome);
                  return (
                    <MenuItem key={outcome} value={outcome}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {config.icon}
                        {config.label}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Date Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="date-filter-label">
                <Box display="flex" alignItems="center" gap={1}>
                  <DateRangeIcon sx={{ fontSize: 16 }} />
                  Date Filter
                </Box>
              </InputLabel>
              <Select
                labelId="date-filter-label"
                value={dateFilter}
                onChange={handleDateFilterChange}
                label="Date Filter"
              >
                <MenuItem value="ALL">All Dates</MenuItem>
                <MenuItem value="TODAY">
                  <Box display="flex" alignItems="center" gap={1}>
                    <TodayIcon sx={{ fontSize: 16 }} />
                    Today
                  </Box>
                </MenuItem>
                <MenuItem value="CUSTOM">
                  <Box display="flex" alignItems="center" gap={1}>
                    <DateRangeIcon sx={{ fontSize: 16 }} />
                    Custom Range
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Quick Today Button */}
            <Button
              variant={dateFilter === "TODAY" ? "contained" : "outlined"}
              startIcon={<TodayIcon />}
              onClick={handleTodayFilter}
              size="small"
              sx={{ fontWeight: 600 }}
            >
              Today
            </Button>

            {/* Clear Filters Button */}
            {(dateFilter !== "ALL" || outcomeFilter !== "ALL") && (
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={() => {
                  handleClearDateFilters();
                  setOutcomeFilter("ALL");
                }}
                size="small"
                color="error"
                sx={{ fontWeight: 600 }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>

          {/* Simple Date Range Inputs */}
          {dateFilter === "CUSTOM" && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }} flexWrap="wrap">
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                size="small"
                sx={{ minWidth: 150 }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max: endDate || getTodayString()
                }}
              />
              <TextField
                label="End Date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                size="small"
                sx={{ minWidth: 150 }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: startDate,
                  max: getTodayString()
                }}
              />
            </Stack>
          )}
        </Box>

        {/* Tabs for Under Review / Reviewed */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="alert review tabs"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem'
              }
            }}
          >
            <Tab
              icon={<PendingIcon />}
              iconPosition="start"
              label={
                <Badge badgeContent={underReviewAlerts.length} color="warning" max={999}>
                  Under Review
                </Badge>
              }
            />
            <Tab
              icon={<VerifiedIcon />}
              iconPosition="start"
              label={
                <Badge badgeContent={reviewedAlerts.length} color="success" max={999}>
                  Reviewed
                </Badge>
              }
            />
          </Tabs>
        </Box>

        {renderTableContent()}
      </CardContent>
    </Card>
  );
};

export default AlertTable;
