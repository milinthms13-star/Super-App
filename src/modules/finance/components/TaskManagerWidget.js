import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  IconButton,
  Chip,
  Badge,
  Collapse,
  Alert,
  CircularProgress,
  Divider,
  Button,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  PriorityHigh as HighPriorityIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { financeApi } from '../financeApi';

const TaskManagerWidget = ({ leadId, userId, compact = false }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    loadTasks();
  }, [leadId, userId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (leadId) params.leadId = leadId;
      if (userId) params.assignedTo = userId;
      params.status = 'pending';
      params.sortBy = 'dueDate';
      params.order = 'asc';
      
      const response = await financeApi.getCRMTasks(params);
      setTasks(response.tasks || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      
      await financeApi.updateCRMTask(taskId, { status: newStatus });
      
      // Update local state
      setTasks(tasks.map(t => 
        t._id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      setError('Failed to update task status');
    }
  };

  const getTaskPriority = (task) => {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { level: 'overdue', color: 'error', label: 'Overdue' };
    if (diffDays === 0) return { level: 'today', color: 'warning', label: 'Due Today' };
    if (diffDays <= 3) return { level: 'urgent', color: 'warning', label: 'Urgent' };
    return { level: 'normal', color: 'default', label: 'Normal' };
  };

  const getTaskIcon = (priority) => {
    switch (priority.level) {
      case 'overdue':
        return <WarningIcon color="error" />;
      case 'today':
      case 'urgent':
        return <HighPriorityIcon color="warning" />;
      default:
        return <TaskIcon color="action" />;
    }
  };

  const overdueCount = tasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    return dueDate < new Date() && t.status === 'pending';
  }).length;

  const todayCount = tasks.filter(t => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString() && t.status === 'pending';
  }).length;

  return (
    <Paper sx={{ p: compact ? 1 : 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={tasks.length} color="primary">
            <TaskIcon color="primary" />
          </Badge>
          <Typography variant={compact ? 'subtitle1' : 'h6'}>
            Pending Tasks
          </Typography>
        </Box>
        <Box>
          <IconButton size="small" onClick={loadTasks} disabled={loading}>
            <RefreshIcon fontSize="small" />
          </IconButton>
          {compact && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Priority Summary */}
      {(overdueCount > 0 || todayCount > 0) && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {overdueCount > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${overdueCount} Overdue`}
              color="error"
              size="small"
            />
          )}
          {todayCount > 0 && (
            <Chip
              icon={<HighPriorityIcon />}
              label={`${todayCount} Due Today`}
              color="warning"
              size="small"
            />
          )}
        </Box>
      )}

      <Collapse in={expanded}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography color="textSecondary">
              No pending tasks
            </Typography>
          </Box>
        ) : (
          <List dense={compact}>
            {tasks.map((task, index) => {
              const priority = getTaskPriority(task);
              return (
                <React.Fragment key={task._id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={task.status === 'completed'}
                        onChange={() => handleToggleTask(task._id)}
                      />
                    }
                    sx={{
                      bgcolor: priority.level === 'overdue' ? 'error.light' : 
                               priority.level === 'today' ? 'warning.light' : 
                               'transparent',
                      opacity: task.status === 'completed' ? 0.6 : 1,
                    }}
                  >
                    <ListItemIcon>
                      {getTaskIcon(priority)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {task.title}
                          </Typography>
                          <Chip
                            label={priority.label}
                            size="small"
                            color={priority.color}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="caption" display="block">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </Typography>
                          {task.description && (
                            <Typography variant="caption" color="textSecondary">
                              {task.description.substring(0, 50)}
                              {task.description.length > 50 && '...'}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Collapse>

      {/* View All Button */}
      {tasks.length > 5 && compact && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : `View All (${tasks.length})`}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default TaskManagerWidget;
