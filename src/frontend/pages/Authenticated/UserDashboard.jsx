// File: src/frontend/pages/Authenticated/UserDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Container, Paper, CircularProgress, Alert,
  Grid, Card, CardHeader, CardContent, Chip, useTheme, Divider, alpha, Avatar, List, ListItem, ListItemAvatar, ListItemText, IconButton
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, CheckCircle2, AlertTriangle, FileText, Users, CalendarClock, TrendingUp, ArrowRight, Eye } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getData } from '../../utils/BackendRequestHelper';

// --- Reusable Components ---

const StatCard = ({ title, value, icon, color = "primary.main", delay = 0 }) => {
    const theme = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            style={{ height: '100%' }}
        >
            <Card elevation={2} sx={{ height: '100%', borderRadius: theme.shape.borderRadiusLG, overflow: 'hidden' }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Typography variant="body1" fontWeight={500} color="text.secondary">{title}</Typography>
                        <Avatar sx={{ bgcolor: alpha(color, 0.1), width: 40, height: 40 }}>
                            {React.cloneElement(icon, { style: { color, width: 20, height: 20 } })}
                        </Avatar>
                    </Box>
                    <Typography variant="h4" fontWeight={700} sx={{ color, mt: 2 }}>
                        ${value}
                    </Typography>
                </CardContent>
            </Card>
        </motion.div>
    );
};

// --- Main Dashboard Component ---

export function UserDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { profile } = useUserStore();
  const navigate = useNavigate();
  const theme = useTheme();

  // THE FIX: Define statusStyles inside the component to get access to the theme object
  const statusStyles = {
    paid: { label: 'Paid', color: theme.palette.success.main, icon: <CheckCircle2 size={18} /> },
    sent: { label: 'Sent', color: theme.palette.info.main, icon: <TrendingUp size={18} /> },
    overdue: { label: 'Overdue', color: theme.palette.error.main, icon: <AlertTriangle size={18} /> },
    draft: { label: 'Draft', color: theme.palette.text.secondary, icon: <FileText size={18} /> },
  };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await getData('invoices');
        setInvoices(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      } catch (err) {
        setError('Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const paidThisMonth = invoices
      .filter(inv => {
        const paidDate = new Date(inv.updated_at);
        return inv.status === 'paid' && paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

    const dueNext30Days = invoices
      .filter(inv => {
        const dueDate = new Date(inv.due_date);
        return (inv.status === 'sent' || inv.status === 'overdue') && dueDate >= now && dueDate <= thirtyDaysFromNow;
      })
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
      
    const overdue = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);

    return {
      paidThisMonth: paidThisMonth.toFixed(2),
      dueNext30Days: dueNext30Days.toFixed(2),
      overdue: overdue.toFixed(2),
    };
  }, [invoices]);

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  if (error) return <Container maxWidth="sm" sx={{py: 5}}><Alert severity="error">{error}</Alert></Container>;

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }};

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>{getGreeting()}, {profile?.first_name || 'User'}!</Typography>
                    <Typography color="text.secondary">Here's your cash flow at a glance.</Typography>
                </Box>
                <Button variant="contained" color="secondary" size="large" startIcon={<Plus />} onClick={() => navigate('/invoices/new')}>Create Invoice</Button>
            </Box>
        </motion.div>
      
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}><StatCard title="Paid This Month" value={stats.paidThisMonth} icon={<CheckCircle2/>} color={theme.palette.success.main} delay={1} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Due in Next 30 Days" value={stats.dueNext30Days} icon={<CalendarClock/>} color={theme.palette.info.main} delay={2} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Overdue" value={stats.overdue} icon={<AlertTriangle/>} color={theme.palette.error.main} delay={3} /></Grid>
        </Grid>
        
        <motion.div variants={itemVariants}>
          <Card elevation={2} sx={{ borderRadius: theme.shape.borderRadiusLG }}>
              <CardHeader 
                title={<Typography variant="h6" fontWeight={600}>Recent Invoices</Typography>}
                action={<Button size="small" onClick={() => navigate('/invoices')} endIcon={<ArrowRight size={16}/>}>View All</Button>}
              />
              <CardContent>
                {invoices.length > 0 ? (
                  <List disablePadding>
                    {invoices.slice(0, 5).map(invoice => {
                      const status = statusStyles[invoice.status] || {label: 'Unknown', color: theme.palette.text.secondary, icon: <FileText size={18}/>};
                      return (
                       <ListItem 
                          key={invoice.invoice_id}
                          button 
                          onClick={() => navigate(`/invoices/edit/${invoice.invoice_id}`)}
                          secondaryAction={<Typography fontWeight={600}>${parseFloat(invoice.total_amount).toFixed(2)}</Typography>}
                          sx={{borderRadius: 1, '&:hover': {bgcolor: 'action.hover'}, my: 0.5}}
                        >
                        <ListItemAvatar>
                          <Avatar sx={{bgcolor: alpha(status.color, 0.1)}}>
                            {React.cloneElement(status.icon, {color: status.color})}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                          primary={<Typography fontWeight={500}>{invoice.client_name}</Typography>}
                          secondary={`#${invoice.invoice_number} - Due ${new Date(invoice.due_date).toLocaleDateString()}`}
                        />
                      </ListItem>
                      )
                    })}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', p: 4 }}>
                      <FileText size={48} opacity={0.3} />
                      <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>No Invoices Yet</Typography>
                      <Typography color="text.secondary" sx={{mb: 2}}>Create your first invoice to see your activity here.</Typography>
                      <Button variant="contained" onClick={() => navigate('/invoices/new')}>Create First Invoice</Button>
                  </Box>
                )}
              </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Container>
  );
}