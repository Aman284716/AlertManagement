// src/components/AlertDashboard.js
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Avatar,
  Container
} from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import AnalyticsIcon from "@mui/icons-material/Analytics";

const MetricCard = ({ title, value, icon, color, subtitle, bgColor }) => (
  <Card 
    sx={{ 
      height: "100%",
      background: bgColor,
      color: "white",
      position: "relative",
      overflow: "hidden",
      minHeight: "140px"
    }}
  >
    <CardContent sx={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, letterSpacing: "-0.02em" }}>
            {value}
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 600, mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 500 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar 
          sx={{ 
            width: 56, 
            height: 56, 
            bgcolor: "rgba(255,255,255,0.2)"
          }}
        >
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const AlertDashboard = ({ stats }) => {
  const accuracy = ((stats.true_positives / stats.total_investigations) * 100).toFixed(1);
  
  return (
    <Container maxWidth="xl" sx={{ py: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 4, mt: 2 }}>
        <Avatar 
          sx={{ 
            mr: 2, 
            bgcolor: "primary.main",
            width: 48,
            height: 48
          }}
        >
          <AnalyticsIcon />
        </Avatar>
        <Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "text.primary"
            }}
          >
            Investigation Analytics
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: "text.secondary",
              fontWeight: 500
            }}
          >
            Real-time threat detection and analysis metrics
          </Typography>
        </Box>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Investigations"
            value={stats.total_investigations}
            icon={<TrendingUpIcon sx={{ fontSize: 28 }} />}
            bgColor="#006666"
            subtitle="All time investigations"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="True Positives"
            value={stats.true_positives}
            icon={<CheckCircleIcon sx={{ fontSize: 28 }} />}
            bgColor="#24a148"
            subtitle={`${accuracy}% accuracy`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="False Positives"
            value={stats.false_positives}
            icon={<ErrorIcon sx={{ fontSize: 28 }} />}
            bgColor="#da1e28"
            subtitle="Reduced by AI learning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Under Review"
            value={stats.under_investigation}
            icon={<HourglassTopIcon sx={{ fontSize: 28 }} />}
            bgColor="#f1c21b"
            subtitle="Pending human review"
          />
        </Grid>
      </Grid>

    </Container>
  );
};

export default AlertDashboard;
