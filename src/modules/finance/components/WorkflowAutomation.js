import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Autorenew as AutoIcon,
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { financeApi } from '../financeApi';

const WorkflowAutomation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Workflow settings
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(true);
  const [assignmentStrategy, setAssignmentStrategy] = useState('round_robin');
  const [slaEnabled, setSlaEnabled] = useState(true);
  const [slaHours, setSlaHours] = useState(48);
  const [autoFollowupEnabled, setAutoFollowupEnabled] = useState(true);
  const [followupDays, setFollowupDays] = useState(3);
  
  // Stats
  const [workflowStats, setWorkflowStats] = useState(null);

  useEffect(() => {
    loadWorkflowSettings();
    loadWorkflowStats();
  }, []);

  const loadWorkflowSettings = async () => {
    try {
      // In real implementation, load settings from API
      // For now, using defaults
    } catch (err) {
      console.error('Failed to load workflow settings:', err);
    }
  };

  const loadWorkflowStats = async () => {
    try {
      const response = await financeApi.getWorkflowStats();
      setWorkflowStats(response);
    } catch (err) {
      console.error('Failed to load workflow stats:', err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const settings = {
        autoAssignEnabled,
        assignmentStrategy,
        slaEnabled,
        slaHours,
        autoFollowupEnabled,
        followupDays,
      };

      // In real implementation, save to API
      console.log('Saving workflow settings:', settings);
      
      setSuccess('Workflow settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save workflow settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestWorkflow = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate workflow test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Workflow test completed successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Workflow test failed');
    } finally {
      setLoading(false);
    }
  };

  const assignmentStrategies = [
    { value: 'round_robin', label: 'Round Robin', description: 'Distribute evenly among all agents' },
    { value: 'load_based', label: 'Load Based', description: 'Assign to agent with least active leads' },
    { value: 'skill_based', label: 'Skill Based', description: 'Match lead type with agent expertise' },
    { value: 'geographic', label: 'Geographic', description: 'Assign based on location proximity' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoIcon color="primary" />
          <Typography variant="h5">Workflow Automation</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<PlayIcon />}
            onClick={handleTestWorkflow}
            disabled={loading}
          >
            Test Workflow
          </Button>
          <IconButton onClick={loadWorkflowStats}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Workflow Stats */}
        {workflowStats && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Workflow Statistics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Auto-Assigned Today
                      </Typography>
                      <Typography variant="h4">
                        {workflowStats.autoAssignedToday || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        SLA Breaches
                      </Typography>
                      <Typography variant="h4" color="error.main">
                        {workflowStats.slaBreaches || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Auto Follow-ups
                      </Typography>
                      <Typography variant="h4">
                        {workflowStats.autoFollowups || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography color="textSecondary" gutterBottom>
                        Avg. Response Time
                      </Typography>
                      <Typography variant="h4">
                        {workflowStats.avgResponseTime || 0}h
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Auto-Assignment Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Lead Assignment</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoAssignEnabled}
                  onChange={(e) => setAutoAssignEnabled(e.target.checked)}
                />
              }
              label="Enable Auto-Assignment"
            />
            
            {autoAssignEnabled && (
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Assignment Strategy</InputLabel>
                  <Select
                    value={assignmentStrategy}
                    onChange={(e) => setAssignmentStrategy(e.target.value)}
                    label="Assignment Strategy"
                  >
                    {assignmentStrategies.map((strategy) => (
                      <MenuItem key={strategy.value} value={strategy.value}>
                        {strategy.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Alert severity="info" icon={<InfoIcon />}>
                  {assignmentStrategies.find(s => s.value === assignmentStrategy)?.description}
                </Alert>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* SLA Management */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">SLA Management</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={slaEnabled}
                  onChange={(e) => setSlaEnabled(e.target.checked)}
                />
              }
              label="Enable SLA Monitoring"
            />
            
            {slaEnabled && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="SLA Time Limit (hours)"
                  value={slaHours}
                  onChange={(e) => setSlaHours(parseInt(e.target.value))}
                  helperText="Escalate leads not contacted within this timeframe"
                  inputProps={{ min: 1, max: 168 }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Auto Follow-up */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Auto Follow-up</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoFollowupEnabled}
                  onChange={(e) => setAutoFollowupEnabled(e.target.checked)}
                />
              }
              label="Enable Auto Follow-up"
            />
            
            {autoFollowupEnabled && (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Follow-up Interval (days)"
                  value={followupDays}
                  onChange={(e) => setFollowupDays(parseInt(e.target.value))}
                  helperText="Send automatic follow-up reminders"
                  inputProps={{ min: 1, max: 30 }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Active Workflows */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Workflows
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              <ListItem>
                <ListItemText
                  primary="New Lead Assignment"
                  secondary="Automatically assign new leads to agents"
                />
                <Chip
                  label={autoAssignEnabled ? "Active" : "Inactive"}
                  color={autoAssignEnabled ? "success" : "default"}
                  size="small"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="SLA Monitoring"
                  secondary="Monitor and escalate SLA breaches"
                />
                <Chip
                  label={slaEnabled ? "Active" : "Inactive"}
                  color={slaEnabled ? "success" : "default"}
                  size="small"
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText
                  primary="Follow-up Reminders"
                  secondary="Send automatic follow-up notifications"
                />
                <Chip
                  label={autoFollowupEnabled ? "Active" : "Inactive"}
                  color={autoFollowupEnabled ? "success" : "default"}
                  size="small"
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveSettings}
          disabled={loading}
        >
          Save Workflow Settings
        </Button>
      </Box>
    </Box>
  );
};

export default WorkflowAutomation;
