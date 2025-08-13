// src/components/AlertDetailModal.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  TextField,
  FormControlLabel
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SecurityIcon from "@mui/icons-material/Security";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AssessmentIcon from "@mui/icons-material/Assessment";
import WarningIcon from "@mui/icons-material/Warning";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import GavelIcon from "@mui/icons-material/Gavel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import InfoIcon from "@mui/icons-material/Info";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TimelineIcon from "@mui/icons-material/Timeline";
import CheckIcon from "@mui/icons-material/Check";
import CancelIcon from "@mui/icons-material/Cancel";
import ApprovalIcon from "@mui/icons-material/ThumbUp";

// API configuration
const API_BASE_URL = 'http://127.0.0.1:8000';

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
  let observationCounter = 1;

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
      sections.description += (sections.description ? '\n' : '') + line;
    }
  }

  return sections;
};

const BeautifiedExplanation = ({ explanation }) => {
  const parsed = parseExplanation(explanation);
  
  if (!parsed) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No explanation available
      </Typography>
    );
  }

  return (
    <Box>
      {/* Description */}
      {parsed.description && (
        <Card variant="outlined" sx={{ mb: 3, border: '1px solid #e3f2fd' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 32, height: 32, mr: 2 }}>
                <InfoIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
                Overview
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.7,
                color: 'text.primary',
                backgroundColor: '#f8fafe',
                p: 2,
                borderRadius: 1,
                border: '1px solid #e3f2fd'
              }}
            >
              {parsed.description}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Key Observations */}
      {parsed.keyObservations.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3, border: '1px solid #fff3e0' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: '#f57c00', width: 32, height: 32, mr: 2 }}>
                <TrendingUpIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#f57c00' }}>
                Key Observations
              </Typography>
            </Box>
            
            <List sx={{ p: 0 }}>
              {parsed.keyObservations.map((observation, index) => (
                <ListItem key={index} sx={{ px: 0, alignItems: 'flex-start' }}>
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <Avatar sx={{ bgcolor: '#fff3e0', color: '#f57c00', width: 24, height: 24 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {index + 1}
                      </Typography>
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#f57c00', mb: 1 }}>
                        {observation.title}
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.primary',
                          lineHeight: 1.6,
                          backgroundColor: '#fafafa',
                          p: 1.5,
                          borderRadius: 1,
                          border: '1px solid #f0f0f0'
                        }}
                      >
                        {observation.content}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Conclusion */}
      {parsed.conclusion && (
        <Card variant="outlined" sx={{ border: '1px solid #e8f5e8' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar sx={{ bgcolor: '#4caf50', width: 32, height: 32, mr: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#4caf50' }}>
                Conclusion & Recommendation
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.7,
                color: 'text.primary',
                backgroundColor: '#f1f8e9',
                p: 2,
                borderRadius: 1,
                border: '1px solid #e8f5e8',
                fontWeight: 500
              }}
            >
              {parsed.conclusion}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// Rules Status Display Component
const RulesStatusDisplay = ({ rules }) => {
  if (!rules || rules.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2, border: '1px solid #e3f2fd' }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1976d2', mb: 2 }}>
          Rules Evaluation
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rules.map((rule, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 1.5, 
                backgroundColor: rule.matched ? '#e8f5e8' : '#fce4ec',
                borderRadius: 1,
                border: `1px solid ${rule.matched ? '#4caf50' : '#f44336'}30`
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: rule.matched ? '#4caf50' : '#f44336', 
                  width: 24, 
                  height: 24, 
                  mr: 1.5 
                }}
              >
                {rule.matched ? (
                  <CheckIcon sx={{ fontSize: 16 }} />
                ) : (
                  <CancelIcon sx={{ fontSize: 16 }} />
                )}
              </Avatar>
              <Typography 
                variant="body2" 
                sx={{ 
                  flexGrow: 1,
                  fontWeight: 500,
                  color: rule.matched ? '#2e7d32' : '#c62828'
                }}
              >
                {rule.rule}
              </Typography>
              <Chip 
                label={rule.matched ? 'PASSED' : 'FAILED'} 
                size="small"
                color={rule.matched ? 'success' : 'error'}
                variant="filled"
                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

const AgentStepProgress = ({ agentOutputs }) => {
  const steps = [
    {
      label: 'Pattern Recognition Agent',
      agent: 'PatternRecognitionAgent',
      icon: <SearchIcon />,
      color: '#1976d2'
    },
    {
      label: 'Explanation Agent',
      agent: 'ExplanationAgent',
      icon: <AnalyticsIcon />,
      color: '#2e7d32'
    },
    {
      label: 'Risk Assessment Agent',
      agent: 'RiskAssessmentAgent',
      icon: <GavelIcon />,
      color: '#ed6c02'
    }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper orientation="vertical">
        {steps.map((step, index) => {
          const agentData = agentOutputs[step.agent];
          const isActive = agentData && Object.keys(agentData).length > 0;
          
          return (
            <Step key={step.label} active={true} completed={isActive}>
              <StepLabel
                StepIconComponent={() => (
                  <Avatar
                    sx={{
                      bgcolor: isActive ? step.color : '#bdbdbd',
                      width: 32,
                      height: 32
                    }}
                  >
                    {step.icon}
                  </Avatar>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: step.color }}>
                    {step.label}
                  </Typography>
                  {/* Show rules status for Pattern Recognition Agent */}
                  {step.agent === 'PatternRecognitionAgent' && agentData?.rules_used && (
                    <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                      {agentData.rules_used.map((rule, idx) => (
                        <Avatar
                          key={idx}
                          sx={{
                            width: 20,
                            height: 20,
                            bgcolor: rule.matched ? '#4caf50' : '#f44336'
                          }}
                          title={rule.rule}
                        >
                          {rule.matched ? (
                            <CheckIcon sx={{ fontSize: 12 }} />
                          ) : (
                            <CancelIcon sx={{ fontSize: 12 }} />
                          )}
                        </Avatar>
                      ))}
                    </Box>
                  )}
                </Box>
              </StepLabel>
              <StepContent>
                {isActive ? (
                  <AgentOutputCard agentName={step.agent} output={agentData} color={step.color} />
                ) : (
                  <Typography color="text.secondary" sx={{ ml: 2, mb: 2 }}>
                    No data available for this agent
                  </Typography>
                )}
              </StepContent>
            </Step>
          );
        })}
      </Stepper>
    </Box>
  );
};

const AgentOutputCard = ({ agentName, output, color }) => {
  if (!output || Object.keys(output).length === 0) {
    return null;
  }

  const renderPatternRecognitionAgent = (data) => (
    <Box sx={{ mb: 2 }}>
      {/* Rules Status Display */}
      {data.rules_used && <RulesStatusDisplay rules={data.rules_used} />}
      
      {data.llm_analysis && (
        <Card variant="outlined" sx={{ mb: 2, border: `1px solid ${color}30` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color, mb: 1 }}>
              LLM Analysis
            </Typography>
            
            {data.llm_analysis.patterns && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Detected Patterns:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {data.llm_analysis.patterns.map((pattern, idx) => (
                    <Chip key={idx} label={pattern} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Only show Evidence section if data exists */}
            {data.llm_analysis.evidence && 
             data.llm_analysis.evidence.transaction_amount && 
             data.llm_analysis.evidence.current_balance && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Evidence:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Transaction Amount</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ${data.llm_analysis.evidence.transaction_amount?.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Current Balance</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      ${data.llm_analysis.evidence.current_balance?.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="text.secondary">Percentage</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {data.llm_analysis.evidence.percentage?.toFixed(2)}%
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Confidence:
              </Typography>
              <Box sx={{ width: 100 }}>
                <LinearProgress
                  variant="determinate"
                  value={(data.llm_analysis.confidence || 0) * 100}
                  sx={{
                    height: 8,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': { backgroundColor: color }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color }}>
                {((data.llm_analysis.confidence || 0) * 100).toFixed(1)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {data.overall_confidence && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Overall Confidence:</strong> {(data.overall_confidence * 100).toFixed(1)}%
        </Typography>
      )}
    </Box>
  );

  const renderExplanationAgent = (data) => (
    <Box sx={{ mb: 2 }}>
      {data.explanation && (
        <Card variant="outlined" sx={{ mb: 2, border: `1px solid ${color}30` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color, mb: 2 }}>
              Detailed Analysis Report
            </Typography>
            <BeautifiedExplanation explanation={data.explanation} />
          </CardContent>
        </Card>
      )}

      {data.evidence_summary && (
        <Card variant="outlined" sx={{ mb: 2, border: `1px solid ${color}30` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color, mb: 1 }}>
              Evidence Summary
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Total Queries</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {data.evidence_summary.total_queries_executed || 0}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Data Points</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {data.evidence_summary.total_data_points || 0}
                </Typography>
              </Grid>
            </Grid>
            
            {data.evidence_summary.key_findings && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Key Findings:
                </Typography>
                <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
                  {data.evidence_summary.key_findings.map((finding, idx) => (
                    <Typography key={idx} variant="caption" sx={{ display: 'block', mb: 0.5, fontFamily: 'monospace' }}>
                      {finding}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {data.investigation_trail && (
        <Card variant="outlined" sx={{ border: `1px solid ${color}30` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color, mb: 1 }}>
              Investigation Trail
            </Typography>
            {data.investigation_trail.map((trail, idx) => (
              <Box key={idx} sx={{ mb: 1, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {trail.agent} - Loop {trail.loop_iteration}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                  Confidence: {trail.confidence_contributed}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderRiskAssessmentAgent = (data) => (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Card variant="outlined" sx={{ textAlign: 'center', border: `1px solid ${color}30` }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="caption" color="text.secondary">Final Confidence</Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, color }}>
                {(data.final_confidence * 100).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card variant="outlined" sx={{ textAlign: 'center', border: `1px solid ${color}30` }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="caption" color="text.secondary">Risk Level</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color }}>
                {data.risk_level}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card variant="outlined" sx={{ textAlign: 'center', border: `1px solid ${color}30` }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="caption" color="text.secondary">Investigation Loops</Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color }}>
                {data.investigation_loops || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {data.key_indicators && (
        <Card variant="outlined" sx={{ border: `1px solid ${color}30` }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color, mb: 1 }}>
              Key Risk Indicators
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {data.key_indicators.map((indicator, idx) => (
                <Chip 
                  key={idx} 
                  label={indicator} 
                  size="small" 
                  color="" 
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  return (
    <Paper elevation={0} sx={{ p: 2, backgroundColor: `${color}05`, border: `1px solid ${color}30` }}>
      {agentName === 'PatternRecognitionAgent' && renderPatternRecognitionAgent(output)}
      {agentName === 'ExplanationAgent' && renderExplanationAgent(output)}
      {agentName === 'RiskAssessmentAgent' && renderRiskAssessmentAgent(output)}
    </Paper>
  );
};

const AlertDetailModal = ({ alert, open, onClose }) => {
  const [detailedAlert, setDetailedAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Review state
  const [hypothesisChanged, setHypothesisChanged] = useState(false);
  const [reviewData, setReviewData] = useState({
    is_suspicious: null,
    investigation_summary: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Initialize review data when alert details are loaded
  useEffect(() => {
    if (detailedAlert) {
      setReviewData({
        is_suspicious: detailedAlert.is_suspicious === 1,
        investigation_summary: detailedAlert.investigation_summary || ''
      });
    }
  }, [detailedAlert]);

  // Fetch detailed alert data from API
  const fetchAlertDetails = async (alertId) => {
    if (!alertId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/alert/${alertId}/result`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setDetailedAlert(data);
    } catch (error) {
      console.error('Error fetching alert details:', error);
      setError(error.message);
      setDetailedAlert(alert);
    } finally {
      setLoading(false);
    }
  };

  // Submit review
  const handleApprove = async () => {
    if (!alert?.alert_id) return;

    setSubmitting(true);
    try {
      const payload = {
        is_suspicious: reviewData.is_suspicious,
        investigation_summary: reviewData.investigation_summary
      };

      const response = await fetch(`${API_BASE_URL}/alerts/${alert.alert_id}/finalize_review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Success - close modal
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
      // You might want to show an error message to the user here
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open && alert && alert.alert_id) {
      fetchAlertDetails(alert.alert_id);
    }
  }, [open, alert]);

  useEffect(() => {
    if (!open) {
      setDetailedAlert(null);
      setError(null);
      setLoading(false);
      setHypothesisChanged(false);
      setReviewData({
        is_suspicious: null,
        investigation_summary: ''
      });
    }
  }, [open]);

  if (!alert) return null;

  const displayAlert = detailedAlert || alert;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { 
          boxShadow: 'none',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        background: "#006666",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar 
            sx={{ 
              mr: 2, 
              bgcolor: "rgba(255,255,255,0.2)",
              width: 40,
              height: 40
            }}
          >
            <SecurityIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Alert Investigation Details
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500 }}>
              Alert ID: {alert.alert_id}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading detailed alert information...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Failed to load detailed alert information: {error}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
              Showing basic alert data instead.
            </Typography>
          </Alert>
        ) : null}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  Outcome
                </Typography>
                <Chip 
                  label={displayAlert.outcome || displayAlert.final_outcome}
                  color={
                    (displayAlert.outcome === "ESCALATE" || displayAlert.final_outcome === "ESCALATE") ? "error" : 
                    (displayAlert.outcome === "AUTO_CLOSE" || displayAlert.final_outcome === "AUTO_CLOSE") ? "success" : "warning"
                  }
                  variant="filled"
                  sx={{ fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  Suspicious
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 700,
                    color: displayAlert.is_suspicious ? "error.main" : "success.main" 
                  }}
                >
                  {displayAlert.is_suspicious ? "Yes" : "No"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  Confidence
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {((displayAlert.confidence || displayAlert.confidence_score) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card variant="outlined" sx={{ height: "100%" }}>
              <CardContent>
                <Typography color="text.secondary" gutterBottom sx={{ fontWeight: 600 }}>
                  Loops Executed
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {displayAlert.loops_executed || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Hypothesis Change Section */}
        <Card sx={{ mb: 1, border: "1px solid #e0e0e0" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={hypothesisChanged}
                    onChange={(e) => setHypothesisChanged(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Change Hypothesis
                  </Typography>
                }
              />
            </Box>
            
            {hypothesisChanged && (
              <Box sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={reviewData.is_suspicious === true}
                          onChange={(e) => setReviewData(prev => ({ 
                            ...prev, 
                            is_suspicious: e.target.checked ? true : (reviewData.is_suspicious === false ? false : null)
                          }))}
                          color="error"
                        />
                      }
                      label="Mark as Suspicious"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={reviewData.is_suspicious === false}
                          onChange={(e) => setReviewData(prev => ({ 
                            ...prev, 
                            is_suspicious: e.target.checked ? false : (reviewData.is_suspicious === true ? true : null)
                          }))}
                          color="success"
                        />
                      }
                      label="Mark as Not Suspicious"
                      sx={{ ml: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Updated Investigation Summary"
                      value={reviewData.investigation_summary}
                      onChange={(e) => setReviewData(prev => ({ 
                        ...prev, 
                        investigation_summary: e.target.value 
                      }))}
                      placeholder="Reviewed. Looks suspicious due to X and Y."
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Investigation Summary */}
        <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  bgcolor: "primary.main",
                  width: 40,
                  height: 40
                }}
              >
                <AssessmentIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Investigation Summary
              </Typography>
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                lineHeight: 1.6,
                color: "text.primary"
              }}
            >
              {displayAlert.investigation_summary || "No summary available"}
            </Typography>
          </CardContent>
        </Card>

        {/* Risk Factors */}
        {displayAlert.risk_factors && displayAlert.risk_factors.length > 0 && (
          <Card sx={{ mb: 3, border: "1px solid #e0e0e0" }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar 
                  sx={{ 
                    mr: 2, 
                    bgcolor: "warning.main",
                    width: 40,
                    height: 40
                  }}
                >
                  <WarningIcon />
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Risk Factors Detected
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {displayAlert.risk_factors.map((factor, index) => (
                  <Chip
                    key={index}
                    label={factor}
                    color=""
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Agent Analysis Progress */}
        <Card sx={{ border: "1px solid #e0e0e0" }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar 
                sx={{ 
                  mr: 2, 
                  bgcolor: "info.main",
                  width: 40,
                  height: 40
                }}
              >
                <PsychologyIcon />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                GenAI Agent Analysis Pipeline
              </Typography>
            </Box>
            
            {displayAlert.agent_outputs && Object.keys(displayAlert.agent_outputs).length > 0 ? (
              <AgentStepProgress agentOutputs={displayAlert.agent_outputs} />
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  textAlign: 'center', 
                  py: 2,
                  fontStyle: 'italic'
                }}
              >
                No agent analysis data available
              </Typography>
            )}
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions sx={{ p: 3, borderTop: "1px solid #e0e0e0" }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          startIcon={<CloseIcon />}
          sx={{ fontWeight: 600 }}
        >
          Close
        </Button>
        <Button 
          onClick={handleApprove}
          variant="contained"
          startIcon={submitting ? <CircularProgress size={20} /> : <ApprovalIcon />}
          disabled={submitting}
          sx={{ 
            fontWeight: 600,
            ml: 1
          }}
        >
          {submitting ? "Approving..." : "Approve"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDetailModal;
