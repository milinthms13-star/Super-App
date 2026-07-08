import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material';
import { financeApi } from '../financeApi';

// Optional: Install chart library
// npm install recharts
// OR
// npm install chart.js react-chartjs-2

// Using Recharts (simpler for React)
// import {
//   LineChart, Line, BarChart, Bar, PieChart, Pie,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
// } from 'recharts';

// Mock chart component for when recharts is not installed
const MockChart = ({ type, data, title }) => (
  <Box sx={{ 
    height: 300, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    border: '2px dashed #ccc',
    borderRadius: 2,
    flexDirection: 'column',
    gap: 2,
  }}>
    <ChartIcon sx={{ fontSize: 60, color: 'text.secondary' }} />
    <Typography variant="h6" color="textSecondary">
      {title}
    </Typography>
    <Typography variant="caption" color="textSecondary">
      Install recharts or chart.js to view charts
    </Typography>
    <Typography variant="caption" color="textSecondary">
      npm install recharts
    </Typography>
  </Box>
);

const AnalyticsCharts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endDate = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '7days':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90days':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const response = await financeApi.getAnalytics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      setAnalyticsData(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Mock data for charts when API doesn't return chart data
  const mockLeadTrendData = [
    { date: '2026-01', leads: 45 },
    { date: '2026-02', leads: 52 },
    { date: '2026-03', leads: 61 },
    { date: '2026-04', leads: 55 },
    { date: '2026-05', leads: 67 },
    { date: '2026-06', leads: 73 },
  ];

  const mockConversionData = [
    { name: 'New', value: 120 },
    { name: 'Contacted', value: 80 },
    { name: 'Verified', value: 50 },
    { name: 'Approved', value: 30 },
  ];

  const mockStatusData = [
    { status: 'New', count: 45 },
    { status: 'Contacted', count: 32 },
    { status: 'Document Verification', count: 28 },
    { status: 'Credit Check', count: 20 },
    { status: 'Approved', count: 15 },
    { status: 'Rejected', count: 8 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h5">Analytics & Charts</Typography>
        </Box>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            label="Time Range"
          >
            <MenuItem value="7days">Last 7 Days</MenuItem>
            <MenuItem value="30days">Last 30 Days</MenuItem>
            <MenuItem value="90days">Last 90 Days</MenuItem>
            <MenuItem value="1year">Last Year</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Leads
                    </Typography>
                    <Typography variant="h4">
                      {analyticsData?.totalLeads || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Conversion Rate
                    </Typography>
                    <Typography variant="h4">
                      {analyticsData?.conversionRate || 0}%
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Approved Leads
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {analyticsData?.approvedLeads || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg. Processing
                    </Typography>
                    <Typography variant="h4">
                      {analyticsData?.avgProcessingTime || 0}d
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Lead Trend Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Lead Trend Over Time
              </Typography>
              <MockChart 
                type="line" 
                data={mockLeadTrendData}
                title="Lead Trend Chart"
              />
              {/* When recharts is installed, use:
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockLeadTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="leads" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              */}
            </Paper>
          </Grid>

          {/* Conversion Funnel */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Conversion Funnel
              </Typography>
              <MockChart 
                type="pie" 
                data={mockConversionData}
                title="Conversion Funnel"
              />
              {/* When recharts is installed, use:
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockConversionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mockConversionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              */}
            </Paper>
          </Grid>

          {/* Status Distribution */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Lead Status Distribution
              </Typography>
              <MockChart 
                type="bar" 
                data={mockStatusData}
                title="Status Distribution Chart"
              />
              {/* When recharts is installed, use:
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
              */}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Installation Note */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="subtitle2" gutterBottom>
          📊 Chart Library Installation
        </Typography>
        <Typography variant="body2">
          To see actual charts, install one of these libraries:
        </Typography>
        <Typography variant="body2" component="pre" sx={{ mt: 1, p: 1, bgcolor: 'white', borderRadius: 1 }}>
          npm install recharts{'\n'}
          OR{'\n'}
          npm install chart.js react-chartjs-2
        </Typography>
      </Paper>
    </Box>
  );
};

export default AnalyticsCharts;
