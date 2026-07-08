import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { financeApi } from '../financeApi';

const InstitutionPortal = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [institutions, setInstitutions] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'bank',
    contactPerson: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadInstitutions();
  }, []);

  useEffect(() => {
    if (selectedInstitution) {
      loadInstitutionData(selectedInstitution._id);
    }
  }, [selectedInstitution]);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await financeApi.getPartnerInstitutions();
      setInstitutions(response.institutions || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutionData = async (institutionId) => {
    try {
      setLoading(true);
      const [leadsResponse, statsResponse] = await Promise.all([
        financeApi.getPartnerLeads(institutionId),
        financeApi.getPartnerStats(institutionId),
      ]);
      setLeads(leadsResponse.leads || []);
      setStats(statsResponse);
    } catch (err) {
      setError('Failed to load institution data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (institution = null) => {
    if (institution) {
      setFormData({
        name: institution.name,
        type: institution.type,
        contactPerson: institution.contactPerson,
        email: institution.email,
        phone: institution.phone,
      });
      setSelectedInstitution(institution);
    } else {
      setFormData({
        name: '',
        type: 'bank',
        contactPerson: '',
        email: '',
        phone: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({
      name: '',
      type: 'bank',
      contactPerson: '',
      email: '',
      phone: '',
    });
  };

  const handleSaveInstitution = async () => {
    try {
      if (selectedInstitution) {
        await financeApi.updatePartnerInstitution(selectedInstitution._id, formData);
      } else {
        await financeApi.registerPartnerInstitution(formData);
      }
      handleCloseDialog();
      loadInstitutions();
    } catch (err) {
      setError('Failed to save institution');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon color="primary" />
          <Typography variant="h5">Partner Institutions Portal</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Institution
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="All Institutions" />
          <Tab label="Institution Details" disabled={!selectedInstitution} />
          <Tab label="Analytics" disabled={!selectedInstitution} />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: All Institutions */}
          {activeTab === 0 && (
            <Grid container spacing={2}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                institutions.map((institution) => (
                  <Grid item xs={12} sm={6} md={4} key={institution._id}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {institution.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          {institution.type.toUpperCase()}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" display="block">
                          Contact: {institution.contactPerson}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Email: {institution.email}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Phone: {institution.phone}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={institution.status}
                            size="small"
                            color={getStatusColor(institution.status)}
                          />
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          startIcon={<ViewIcon />}
                          onClick={() => {
                            setSelectedInstitution(institution);
                            setActiveTab(1);
                          }}
                        >
                          View Details
                        </Button>
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenDialog(institution)}
                        >
                          Edit
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Tab 1: Institution Details */}
          {activeTab === 1 && selectedInstitution && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedInstitution.name} - Lead Details
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Lead ID</TableCell>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Created Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead._id}>
                        <TableCell>{lead.leadId || lead._id.substring(0, 8)}</TableCell>
                        <TableCell>{lead.customerName}</TableCell>
                        <TableCell>₹{lead.loanAmount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip label={lead.status} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Analytics */}
          {activeTab === 2 && selectedInstitution && stats && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Leads
                    </Typography>
                    <Typography variant="h4">{stats.totalLeads || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Approved
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.approvedLeads || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Conversion Rate
                    </Typography>
                    <Typography variant="h4">{stats.conversionRate || 0}%</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Avg. Processing
                    </Typography>
                    <Typography variant="h4">{stats.avgProcessingTime || 0}d</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedInstitution ? 'Edit Institution' : 'Add New Institution'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Institution Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                SelectProps={{ native: true }}
              >
                <option value="bank">Bank</option>
                <option value="nbfc">NBFC</option>
                <option value="fintech">FinTech</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Contact Person"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveInstitution} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstitutionPortal;
