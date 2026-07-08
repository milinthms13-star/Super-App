import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { financeApi } from '../financeApi';

const ReportsPanel = ({ leadId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filter states
  const [reportType, setReportType] = useState('summary');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState(new Date());
  const [institutionId, setInstitutionId] = useState('all');
  const [status, setStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Available institutions (fetch from API in real implementation)
  const [institutions, setInstitutions] = useState([]);

  useEffect(() => {
    loadReportStats();
    loadInstitutions();
  }, []);

  const loadReportStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeApi.getAnalytics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setStats(response);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutions = async () => {
    try {
      // Mock institutions - replace with actual API call
      setInstitutions([
        { id: 'inst1', name: 'HDFC Bank' },
        { id: 'inst2', name: 'ICICI Bank' },
        { id: 'inst3', name: 'Axis Bank' },
      ]);
    } catch (err) {
      console.error('Failed to load institutions:', err);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        reportType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(institutionId !== 'all' && { institutionId }),
        ...(status !== 'all' && { status }),
      };

      const blob = await financeApi.downloadLeadReport(leadId || 'all', 'pdf', params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download PDF report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        reportType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(institutionId !== 'all' && { institutionId }),
        ...(status !== 'all' && { status }),
      };

      const blob = await financeApi.downloadLeadReport(leadId || 'all', 'excel', params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finance_report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download Excel report');
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    { value: 'summary', label: 'Summary Report' },
    { value: 'detailed', label: 'Detailed Report' },
    { value: 'conversion', label: 'Conversion Report' },
    { value: 'performance', label: 'Performance Report' },
    { value: 'institution', label: 'Institution-wise Report' },
  ];

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'document_verification', label: 'Document Verification' },
    { value: 'credit_check', label: 'Credit Check' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'on_hold', label: 'On Hold' },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon color="primary" />
            <Typography variant="h5">
              Reports & Analytics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => setShowFilters(!showFilters)} color="primary">
              <FilterIcon />
            </IconButton>
            <IconButton onClick={loadReportStats} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Stats Summary */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Leads
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalLeads || 0}
                  </Typography>
                  <Chip
                    label={`+${stats.newLeadsToday || 0} today`}
                    size="small"
                    color="primary"
                    sx={{ mt: 1 }}
                  />
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
                    {stats.conversionRate || 0}%
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <TrendingUpIcon fontSize="small" color="success" />
                    <Typography variant="caption" color="success.main" sx={{ ml: 0.5 }}>
                      +{stats.conversionRateChange || 0}%
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Avg. Processing Time
                  </Typography>
                  <Typography variant="h4">
                    {stats.avgProcessingTime || 0}d
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.avgProcessingTimeHours || 0} hours
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Success Rate
                  </Typography>
                  <Typography variant="h4">
                    {stats.successRate || 0}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stats.successfulLeads || 0} approved
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        {showFilters && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Report Filters
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Report Type</InputLabel>
                  <Select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    label="Report Type"
                  >
                    {reportTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    label="Status"
                  >
                    {statuses.map((s) => (
                      <MenuItem key={s.value} value={s.value}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Institution</InputLabel>
                  <Select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    label="Institution"
                  >
                    <MenuItem value="all">All Institutions</MenuItem>
                    {institutions.map((inst) => (
                      <MenuItem key={inst.id} value={inst.id}>
                        {inst.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={loadReportStats} variant="outlined">
                Apply Filters
              </Button>
            </Box>
          </Paper>
        )}

        {/* Download Actions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Download Reports
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PdfIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h6">PDF Report</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Formatted report with charts and summaries
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadPDF}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'Download PDF'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ExcelIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h6">Excel Report</Typography>
                      <Typography variant="body2" color="textSecondary">
                        Spreadsheet with detailed data for analysis
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownloadExcel}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : 'Download Excel'}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Report Description */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Report Configuration:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip label={reportTypes.find(t => t.value === reportType)?.label} size="small" color="primary" />
              <Chip label={`${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`} size="small" />
              {status !== 'all' && (
                <Chip label={statuses.find(s => s.value === status)?.label} size="small" />
              )}
              {institutionId !== 'all' && (
                <Chip label={institutions.find(i => i.id === institutionId)?.name} size="small" />
              )}
            </Stack>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsPanel;
