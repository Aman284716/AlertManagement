// src/components/Dashboard.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Divider
} from "@mui/material";
import Header from "./Header";
import AlertDashboard from "./AlertDashboard";
import AlertTable from "./AlertTable";
import AlertDetailModal from "./AlertDetailModal";
import StatsCards from "./StatsCards";

// Import icons for processing stages
import DatasetIcon from "@mui/icons-material/Dataset";
import SearchIcon from "@mui/icons-material/Search";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import GavelIcon from "@mui/icons-material/Gavel";
import InvestigateIcon from "@mui/icons-material/ManageSearch";
import CloseIcon from "@mui/icons-material/Close";
import SecurityIcon from "@mui/icons-material/Security";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AssessmentIcon from "@mui/icons-material/Assessment";
import WarningIcon from "@mui/icons-material/Warning";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

// API configuration
const API_BASE_URL = 'http://localhost:8000';

// Processing stages configuration with 700 tint colors
const processingStages = [
  {
    key: "ingestion",
    label: "Data Ingestion",
    icon: <DatasetIcon />,
    color: "#006666",
    duration: () => Math.random() * 3000 + 2000 // 2-5 seconds
  },
  {
    key: "pattern",
    label: "Pattern Recognition",
    icon: <SearchIcon />,
    color: "#006666",
    duration: () => Math.random() * 2500 + 2500 // 2.5-5 seconds
  },
  {
    key: "explanation",
    label: "Analysis & Explanation",
    icon: <AnalyticsIcon />,
    color: "#006666",
    duration: () => Math.random() * 2000 + 3000 // 3-5 seconds
  },
  {
    key: "risk",
    label: "Risk Assessment",
    icon: <GavelIcon />,
    color: "#006666",
    duration: () => Math.random() * 1500 + 2000 // 2-3.5 seconds
  }
];

// Investigation stages for single alert investigation
const investigationStages = [
  {
    key: "pattern_recognition",
    label: "Pattern Recognition",
    agent: "PatternRecognitionAgent",
    icon: <SearchIcon />,
    color: "#1565c0"
  },
  {
    key: "explanation",
    label: "Explanation & Analysis",
    agent: "ExplanationAgent",
    icon: <AnalyticsIcon />,
    color: "#388e3c"
  },
  {
    key: "risk_assessment",
    label: "Risk Assessment",
    agent: "RiskAssessmentAgent",
    icon: <GavelIcon />,
    color: "#f57c00"
  }
];

// Processing Progress Component
const ProcessingProgress = ({ isProcessing, currentStage, processedCount }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setActiveStep(0);
      setProgress(0);
      return;
    }

    let timeoutId;

    const changeStep = () => {
      const currentStageConfig = processingStages[activeStep];
      const duration = currentStageConfig.duration();

      timeoutId = setTimeout(() => {
        setActiveStep((prev) => {
          const nextStep = (prev + 1) % processingStages.length;
          return nextStep;
        });
        changeStep(); // Schedule next step change
      }, duration);
    };

    changeStep(); // Start the cycle

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + Math.random() * 8 + 3;
      });
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
    };
  }, [isProcessing, activeStep]);

  if (!isProcessing) return null;

  return (
    <Card sx={{ mb: 3, border: "2px solid #006666", backgroundColor: "#f3f8ff" }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          <Avatar
            sx={{
              mr: 2,
              bgcolor: "#006666",
              width: 40,
              height: 40,
              animation: "pulse 2s infinite"
            }}
          >
            {processingStages[activeStep].icon}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#006666" }}>
              Processing Alerts...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Currently in: {processingStages[activeStep].label}
            </Typography>
          </Box>
          {processedCount > 0 && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1565c0" }}>
                {processedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Processed
              </Typography>
            </Box>
          )}
        </Box>

        <Stepper activeStep={activeStep} sx={{ mb: 2 }}>
          {processingStages.map((stage, index) => (
            <Step key={stage.key} completed={false}>
              <StepLabel
                StepIconComponent={() => (
                  <Avatar
                    sx={{
                      bgcolor: index === activeStep ? stage.color : '#bdbdbd',
                      width: 32,
                      height: 32,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {stage.icon}
                  </Avatar>
                )}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: index === activeStep ? 600 : 400,
                    color: index === activeStep ? stage.color : 'text.secondary'
                  }}
                >
                  {stage.label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 1 }}>
          <LinearProgress
            variant="indeterminate"
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: processingStages[activeStep].color,
                borderRadius: 4
              }
            }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Analyzing alerts through AI pipeline...
        </Typography>
      </CardContent>
    </Card>
  );
};

// Single Investigation Modal Component
const SingleInvestigationModal = ({ open, onClose, investigationData, loading, error }) => {
  if (!investigationData && !loading && !error) return null;

  const parseExplanation = (explanation) => {
    if (!explanation) return null;

    const sections = {
      title: '',
      description: '',
      keyObservations: [],
      conclusion: ''
    };

    const lines = explanation.split('\n');
    let currentSection = '';

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('**Alert Explanation:**')) {
        sections.title = 'Alert Explanation';
        continue;
      }

      if (line.startsWith('**Key Observations:**')) {
        currentSection = 'observations';
        continue;
      }

      if (line.startsWith('**Conclusion:**')) {
        currentSection = 'conclusion';
        continue;
      }

      if (currentSection === 'observations') {
        if (line.match(/^\d+\.\s\*\*/)) {
          const match = line.match(/^\d+\.\s\*\*(.*?)\*\*(.*)/);
          if (match) {
            sections.keyObservations.push({
              title: match[1].trim(),
              content: match[2].trim()
            });
          }
        } else if (line.startsWith('**') && line.endsWith('**')) {
          sections.keyObservations.push({
            title: line.replace(/\*\*/g, ''),
            content: ''
          });
        } else if (sections.keyObservations.length > 0) {
          const lastObservation = sections.keyObservations[sections.keyObservations.length - 1];
          lastObservation.content += (lastObservation.content ? ' ' : '') + line;
        }
      } else if (currentSection === 'conclusion') {
        sections.conclusion += (sections.conclusion ? '\n' : '') + line;
      } else if (!currentSection && !line.startsWith('**')) {
        sections.description += (sections.description ? ' ' : '') + line;
      }
    }

    return sections;
  };

  const renderAgentOutput = (agentName, output, stage) => {
    if (!output) return null;

    return (
      <Card sx={{ mb: 2, border: `2px solid ${stage.color}30` }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <Avatar sx={{ bgcolor: stage.color, width: 32, height: 32, mr: 2 }}>
              {stage.icon}
            </Avatar>
            <Typography variant="h6" sx={{ fontWeight: 600, color: stage.color }}>
              {stage.label}
            </Typography>
          </Box>

          {/* Pattern Recognition Agent */}
          {agentName === 'PatternRecognitionAgent' && (
            <Box>
              {output.llm_analysis?.patterns && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Detected Patterns:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {output.llm_analysis.patterns.map((pattern, idx) => (
                      <Chip key={idx} label={pattern} color="primary" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}

              {output.llm_analysis?.evidence && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Evidence:
                  </Typography>
                  <Typography variant="body2">
                    Historical Events Count: {output.llm_analysis.evidence.historical_new_payee_events_count || 'N/A'}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Confidence:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(output.overall_confidence || 0) * 100}
                  sx={{
                    width: 100,
                    height: 6,
                    '& .MuiLinearProgress-bar': { backgroundColor: stage.color }
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 600, color: stage.color }}>
                  {((output.overall_confidence || 0) * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          )}

          {/* Explanation Agent */}
          {agentName === 'ExplanationAgent' && (
            <Box>
              {output.explanation && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Detailed Analysis:
                  </Typography>
                  {(() => {
                    const parsed = parseExplanation(output.explanation);
                    return parsed ? (
                      <Box>
                        {parsed.description && (
                          <Typography variant="body2" sx={{ mb: 2, p: 2, backgroundColor: '#f8fafe', borderRadius: 1 }}>
                            {parsed.description}
                          </Typography>
                        )}
                        {parsed.keyObservations.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                              Key Observations:
                            </Typography>
                            <List dense>
                              {parsed.keyObservations.map((obs, idx) => (
                                <ListItem key={idx} sx={{ px: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 32 }}>
                                    <Avatar sx={{ bgcolor: '#fff3e0', color: '#f57c00', width: 24, height: 24 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {idx + 1}
                                      </Typography>
                                    </Avatar>
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#f57c00' }}>
                                        {obs.title}
                                      </Typography>
                                    }
                                    secondary={obs.content}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        {parsed.conclusion && (
                          <Typography variant="body2" sx={{ p: 2, backgroundColor: '#f1f8e9', borderRadius: 1, fontWeight: 500 }}>
                            {parsed.conclusion}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        {output.explanation}
                      </Typography>
                    );
                  })()}
                </Box>
              )}

              {output.evidence_summary && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Evidence Summary:
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption">Total Queries</Typography>
                      <Typography variant="h6">{output.evidence_summary.total_queries_executed}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption">Data Points</Typography>
                      <Typography variant="h6">{output.evidence_summary.total_data_points}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Box>
          )}

          {/* Risk Assessment Agent */}
          {agentName === 'RiskAssessmentAgent' && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">Final Confidence</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: stage.color }}>
                      {(output.final_confidence * 100).toFixed(1)}%
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">Risk Level</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: stage.color }}>
                      {output.risk_level}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="caption" color="text.secondary">Loops</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: stage.color }}>
                      {output.investigation_loops}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {output.key_indicators && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Key Risk Indicators:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {output.key_indicators.map((indicator, idx) => (
                      <Chip key={idx} label={indicator} color="warning" variant="outlined" size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ background: "#006666", color: "white", display: "flex", alignItems: "center" }}>
        <Avatar sx={{ mr: 2, bgcolor: "rgba(255,255,255,0.2)", width: 40, height: 40 }}>
          <InvestigateIcon />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Single Alert Investigation Results
          </Typography>
          {investigationData && (
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Alert ID: {investigationData.alert_id}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Investigating alert...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {investigationData && !loading && (
          <Box>
            {/* Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Outcome</Typography>
                    <Chip
                      label={investigationData.outcome}
                      color={investigationData.outcome === "ESCALATE" ? "error" : investigationData.outcome === "AUTO_CLOSE" ? "success" : "warning"}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Suspicious</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: investigationData.is_suspicious ? "error.main" : "success.main" }}>
                      {investigationData.is_suspicious ? "Yes" : "No"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Confidence</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                      {(investigationData.confidence * 100).toFixed(1)}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Loops</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {investigationData.loops_executed}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Investigation Summary */}
            <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ mr: 2, bgcolor: "primary.main", width: 40, height: 40 }}>
                    <AssessmentIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Investigation Summary
                  </Typography>
                </Box>
                <Typography variant="body1">{investigationData.investigation_summary}</Typography>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            {investigationData.risk_factors && investigationData.risk_factors.length > 0 && (
              <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar sx={{ mr: 2, bgcolor: "warning.main", width: 40, height: 40 }}>
                      <WarningIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Risk Factors
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {investigationData.risk_factors.map((factor, index) => (
                      <Chip key={index} label={factor} color="warning" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Agent Analysis */}
            <Card sx={{ border: "1px solid #e0e0e0" }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={3}>
                  <Avatar sx={{ mr: 2, bgcolor: "info.main", width: 40, height: 40 }}>
                    <PsychologyIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    AI Agent Analysis Pipeline
                  </Typography>
                </Box>

                {investigationStages.map((stage, index) => {
                  const agentOutput = investigationData.agent_outputs[stage.agent];
                  if (!agentOutput) return null;

                  return (
                    <Box key={stage.key}>
                      {renderAgentOutput(stage.agent, agentOutput, stage)}
                      {index < investigationStages.length - 1 && <Divider sx={{ my: 2 }} />}
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="outlined" startIcon={<CloseIcon />}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Single Investigation Button Component
const SingleInvestigationButton = () => {
  const [open, setOpen] = useState(false);
  const [alertId, setAlertId] = useState('');
  const [investigationData, setInvestigationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInvestigate = async () => {
    if (!alertId.trim()) {
      setError('Please enter an Alert ID');
      return;
    }

    setLoading(true);
    setError('');
    setInvestigationData(null);

    try {
      const response = await fetch(`${API_BASE_URL}/investigate_alert/${alertId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json();
        const errorMessage = errorBody?.detail || `HTTP status ${response.status}`;
        throw new Error(`${errorMessage}`);
      }

      const data = await response.json();
      setInvestigationData(data);
      setOpen(true);
    } catch (error) {
      console.error('Error investigating alert:', error);
      setError(`Failed to investigate alert: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={3}>
            <Avatar sx={{ mr: 2, bgcolor: "#006666", width: 48, height: 48 }}>
              <InvestigateIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Single Alert Investigation
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Investigate a specific alert by Alert ID
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={2} alignItems="flex-start">
            <TextField
              label="Alert ID"
              value={alertId}
              onChange={(e) => setAlertId(e.target.value)}
              placeholder="Enter Alert ID (e.g., c81c4818-e99c-4316-9117-c82227d6fced)"
              fullWidth
              size="small"
              error={!!error}
              helperText={error}
            />
            <Button
              variant="contained"
              onClick={handleInvestigate}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <InvestigateIcon />}
              sx={{ minWidth: 140, bgcolor: "#006666", "&:hover": { bgcolor: "#004d4d" } }}
            >
              {loading ? "Investigating..." : "Investigate"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <SingleInvestigationModal
        open={open}
        onClose={() => setOpen(false)}
        investigationData={investigationData}
        loading={loading}
        error={error}
      />
    </Box>
  );
};

const Dashboard = () => {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [currentStage, setCurrentStage] = useState("ingestion");
  const [processingStartTime, setProcessingStartTime] = useState(null);
  const [avgProcessingTime, setAvgProcessingTime] = useState(2.3);

  // Fetch investigation stats
  const fetchInvestigationStats = async () => {
    setStatsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/investigation_stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching investigation stats:', error);
      setStats({});
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch stats on component mount
  useEffect(() => {
    fetchInvestigationStats();
  }, []);

  const handleProcessAlerts = async () => {
    setLoading(true);
    setProcessedCount(0);
    setCurrentStage("ingestion");
    setProcessingStartTime(Date.now());

    try {
      const response = await fetch(`${API_BASE_URL}/process_pending_alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Alerts processed:', result);

      // Set the processed count from API response
      setProcessedCount(result.processed_count || 0);

      // Calculate processing time
      if (processingStartTime) {
        const endTime = Date.now();
        const processingTime = (endTime - processingStartTime) / 1000;
        setAvgProcessingTime(processingTime.toFixed(1));
      }

      // Refresh stats after processing
      await fetchInvestigationStats();

    } catch (error) {
      console.error('Error processing alerts:', error);
      // Even on error, try to refresh stats
      await fetchInvestigationStats();
    } finally {
      setLoading(false);
      setTimeout(() => setProcessedCount(0), 5000); // Reset count after 5 seconds
    }
  };

  // Function to handle alert selection and fetch detailed data
  const openAlertDetail = async (alert) => {
    setSelectedAlert(alert);
  };

  const closeAlertDetail = () => {
    setSelectedAlert(null);
  };

  return (
  <Box sx={{ minHeight: "100vh", backgroundColor: "#ffffff" }}>
    {/* Add CSS for pulse animation */}
    <style jsx>{`
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
    `}</style>

    <Header />
    <Box sx={{ py: 3 }}>
      <AlertDashboard
        stats={stats}
        loading={statsLoading}
      />

      <Container maxWidth="xl" sx={{ mt: 4, px: 3 }}>
        {/* Processing Progress Bar */}
        <ProcessingProgress
          isProcessing={loading}
          currentStage={currentStage}
          processedCount={processedCount}
        />

        {/* Single Investigation Button */}
        <SingleInvestigationButton />

        {/* StatsCards with proper spacing */}
        <Box sx={{ width: "100%", mb: 4 }}>
          <StatsCards
            onProcessAlerts={handleProcessAlerts}
            loading={loading}
            alertCount={processedCount}
            avgProcessingTime={avgProcessingTime}
            stats={stats}
          />
        </Box>
      </Container>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <AlertTable
          onViewAlert={openAlertDetail}
        />
      </Container>

      <AlertDetailModal
        alert={selectedAlert}
        open={!!selectedAlert}
        onClose={closeAlertDetail}
      />
    </Box>
  </Box>
  );
};

export default Dashboard;
