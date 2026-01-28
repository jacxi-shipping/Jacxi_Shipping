'use client';

import { Box, Typography, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import { 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Edit, 
  Plus, 
  Trash 
} from 'lucide-react';

interface LogEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: any;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const getIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE':
        return <Trash className="w-4 h-4 text-red-500" />;
      case 'STATUS_CHANGE':
        return <CheckCircle className="w-4 h-4 text-[var(--accent-gold)]" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Activity Log
      </Typography>
      
      {logs.length === 0 ? (
        <Typography color="textSecondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
          No activity recorded yet.
        </Typography>
      ) : (
        <List sx={{ 
            bgcolor: 'var(--panel)', 
            borderRadius: 2, 
            border: '1px solid var(--border)',
            py: 0
        }}>
          {logs.map((log, index) => (
            <ListItem 
                key={log.id} 
                sx={{ 
                    borderBottom: index < logs.length - 1 ? '1px solid var(--border)' : 'none',
                    py: 1.5
                }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getIcon(log.action)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {log.description}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <User className="w-3 h-3 text-[var(--text-secondary)]" />
                    <Typography variant="caption" color="textSecondary">
                      {log.performedBy}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      • {formatTime(log.timestamp)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}

