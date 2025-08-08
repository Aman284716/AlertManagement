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
  MenuItem
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SecurityIcon from "@mui/icons-material/Security";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TableChartIcon from "@mui/icons-material/TableChart";
import RefreshIcon from "@mui/icons-material/Refresh";
import FilterListIcon from "@mui/icons-material/FilterList";

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
    human_verified: item.human_verified,
    timestamp: item.timestamp
  }));
};

const AlertTable = ({ onViewAlert }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [outcomeFilter, setOutcomeFilter] = useState("ALL");

  // Get unique outcomes for filter
  const getUniqueOutcomes = (alertsData) => {
    const outcomes = [...new Set(alertsData.map(alert => alert.outcome))];
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

    // Uncomment below for actual API call
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
      setFilteredAlerts(filterAlerts(transformedData, outcomeFilter));
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

  // Update filtered alerts when outcome filter changes
  useEffect(() => {
    setFilteredAlerts(filterAlerts(alerts, outcomeFilter));
  }, [alerts, outcomeFilter]);

  const handleRefresh = () => {
    fetchInvestigationOutcomes();
  };

  const handleOutcomeFilterChange = (event) => {
    setOutcomeFilter(event.target.value);
  };

  const uniqueOutcomes = getUniqueOutcomes(alerts);

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
                Detailed analysis of processed security alerts ({filteredAlerts.length} outcomes)
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
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
                <TableCell sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Loading investigation outcomes...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {outcomeFilter === "ALL"
                        ? "No investigation outcomes found"
                        : `No outcomes found for ${getOutcomeConfig(outcomeFilter).label}`
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert, index) => {
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
      </CardContent>
    </Card>
  );
};

export default AlertTable;
