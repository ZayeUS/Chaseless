// File: src/frontend/pages/Authenticated/UserDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  IconButton,
  useTheme,
  alpha,
  Stack,
  Divider
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  Plus,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Send,
  Users
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getData } from '../../utils/BackendRequestHelper';

const StatCard = ({ title, value, icon, color = 'primary.main', delay = 0 }) => {
  const theme = useTheme();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
    >
      <Card
        elevation={3}
        sx={{
          height: '100%',
          borderRadius: theme.shape.borderRadiusLG,
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
            cursor: 'pointer'
          }
        }}
      >
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
            <Avatar sx={{ bgcolor: alpha(color, 0.1), width: 44, height: 44 }}>
              {React.cloneElement(icon, { style: { color, width: 24, height: 24 } })}
            </Avatar>
          </Stack>
          <Box mt="auto">
            <Typography variant="h4" fontWeight={700} sx={{ color }}>
              ${value}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ActivityItem = ({ icon, primary, secondary, amount, statusColor, onClick }) => {
  const theme = useTheme();
  return (
    <ListItem disablePadding>
      <ListItemButton
        onClick={onClick}
        sx={{
          my: 1,
          p: 2,
          borderRadius: theme.shape.borderRadiusLG,
          transition: 'background-color 0.2s, transform 0.2s',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            transform: 'translateX(4px)'
          }
        }}
      >
        <ListItemAvatar>
          <Avatar sx={{ bgcolor: alpha(statusColor, 0.15) }}>
            {React.cloneElement(icon, { style: { color: statusColor, width: 20, height: 20 } })}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={<Typography variant="body1" fontWeight={500}>{primary}</Typography>}
          secondary={<Typography variant="body2" color="text.secondary">{secondary}</Typography>}
        />
        <Typography variant="h6" fontWeight={600} sx={{ color: statusColor }}>
          ${amount}
        </Typography>
        <IconButton edge="end" size="small" sx={{ ml: 1 }}>
          <ArrowRight size={18} />
        </IconButton>
      </ListItemButton>
    </ListItem>
  );
};

export function UserDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile } = useUserStore();
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getData('invoices');
        setInvoices(data);
      } catch {
        setError('Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const { stats, recentActivity } = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    let paidLast30 = 0, outstanding = 0, overdue = 0;
    const list = [];

    invoices.forEach(inv => {
      const amt = parseFloat(inv.total_amount);
      const updated = new Date(inv.updated_at);
      if (inv.status === 'paid' && updated > thirtyDaysAgo) paidLast30 += amt;
      if (['sent', 'overdue'].includes(inv.status)) {
        outstanding += amt;
        if (inv.status === 'overdue') overdue += amt;
      }
      list.push(inv);
    });

    list.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return {
      stats: {
        paidLast30: paidLast30.toFixed(2),
        outstanding: outstanding.toFixed(2),
        overdue: overdue.toFixed(2),
      },
      recentActivity: list.slice(0, 5)
    };
  }, [invoices]);

  const getGreeting = () => {
    const hr = new Date().getHours();
    return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Greeting */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              {getGreeting()}, {profile?.first_name || 'there'}!
            </Typography>
            {parseFloat(stats.overdue) > 0 ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<AlertTriangle size={16} />}
                sx={{ mt: 1 }}
                onClick={() => navigate('/invoices', { state: { filter: 'overdue' } })}
              >
                $ {stats.overdue} overdue
              </Button>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Here’s your cash flow at a glance.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Stats strip */}
        <Box
          sx={{
            width: '100vw',
            position: 'relative',
            left: '50%',
            right: '50%',
            mx: '-50vw',
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            py: 1
          }}
        >
          {[
            { title: 'Outstanding', value: stats.outstanding, icon: <DollarSign />, color: theme.palette.info.main, delay: 1 },
            { title: 'Overdue',      value: stats.overdue,    icon: <AlertTriangle />, color: theme.palette.error.main,   delay: 2 },
            { title: 'Paid (30d)',   value: stats.paidLast30, icon: <CheckCircle2 />, color: theme.palette.success.main, delay: 3 }
          ].map((props, i) => (
            <Box
              key={props.title}
              sx={{ flex: '0 0 100vw', minWidth: '100vw', px: 2 }}
            >
              <StatCard {...props} />
            </Box>
          ))}
        </Box>

        {/* Quick Actions */}
        <Paper
          elevation={1}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: theme.shape.borderRadiusLG,
            bgcolor: alpha(theme.palette.primary.light, 0.05)
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Users size={32} color={theme.palette.primary.main} />
            </Grid>
            <Grid item xs>
              <Typography variant="h6" fontWeight={600}>
                Manage Clients & Invoices
              </Typography>
              <Typography color="text.secondary">
                Quickly add clients or send invoices to keep cash flowing.
              </Typography>
            </Grid>
            <Grid item>
              <Button variant="outlined" onClick={() => navigate('/clients')}>
                Add Client
              </Button>
              <Button
                variant="contained"
                color="secondary"
                sx={{ ml: 2 }}
                startIcon={<Plus />}
                onClick={() => navigate('/invoices/new')}
              >
                Send Invoice
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Recent Activity */}
        <Card elevation={2} sx={{ borderRadius: theme.shape.borderRadiusLG }}>
          <CardHeader
            title={<Typography variant="h6" fontWeight={600}>Recent Activity</Typography>}
            action={
              <Button size="small" onClick={() => navigate('/invoices')} endIcon={<ArrowRight size={16}/>}>
                View All
              </Button>
            }
          />
          <Divider />
          <CardContent>
            {recentActivity.length ? (
              <List disablePadding>
                {recentActivity.map(item => {
                  const map = {
                    paid:    { text: 'Payment received from', icon: <CheckCircle2/>,  color: theme.palette.success.main },
                    sent:    { text: 'Invoice sent to',       icon: <Send/>,           color: theme.palette.info.main    },
                    overdue: { text: 'Invoice overdue for',   icon: <AlertTriangle/>,  color: theme.palette.error.main   },
                    draft:   { text: 'Draft for',             icon: <FileText/>,       color: theme.palette.text.secondary }
                  };
                  const m = map[item.status] || map.draft;
                  return (
                    <ActivityItem
                      key={item.invoice_id}
                      onClick={() => navigate(`/invoices/${item.invoice_id}`)}
                      icon={m.icon}
                      statusColor={m.color}
                      primary={`${m.text} ${item.client_name}`}
                      secondary={`#${item.invoice_number} · ${new Date(item.updated_at).toLocaleDateString()}`}
                      amount={parseFloat(item.total_amount).toFixed(2)}
                    />
                  );
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <FileText size={48} color={theme.palette.text.secondary} opacity={0.3}/>
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>No recent activity</Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Start by creating an invoice or adding a client.
                </Typography>
                <Button variant="contained" color="secondary" startIcon={<Plus />} onClick={() => navigate('/invoices/new')}>
                  Create Invoice
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
}
