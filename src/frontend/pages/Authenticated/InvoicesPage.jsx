// File: src/frontend/pages/Authenticated/InvoicesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Container, CircularProgress, Alert,
  Grid, Card, CardContent, Chip, useTheme, Divider, alpha, Avatar, TextField, InputAdornment, ToggleButton, ToggleButtonGroup, Tooltip, IconButton,Paper
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
// UPDATED: Import new icons for clarity
import { Plus, Search, FileText, CheckCircle2, Mail, AlertTriangle, ExternalLink } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getData } from '../../utils/BackendRequestHelper';
import { useDebounce } from '../../utils/useDebounce';

const statusStyles = {
    paid: { label: 'Paid', color: 'success', icon: <CheckCircle2 size={18} /> },
    sent: { label: 'Sent', color: 'info', icon: <Mail size={18} /> },
    overdue: { label: 'Overdue', color: 'error', icon: <AlertTriangle size={18} /> },
    draft: { label: 'Draft', color: 'default', icon: <FileText size={18} /> },
};

// A single, animated invoice card component
const InvoiceCard = ({ invoice, navigate }) => {
    const theme = useTheme();
    const status = statusStyles[invoice.status] || { label: invoice.status, color: 'default', icon: <FileText size={18}/> };

    const handleViewPublic = (e) => {
        // Stop the click from propagating to the card's main onClick handler
        e.stopPropagation();
        window.open(`/invoice/${invoice.invoice_id}`, '_blank');
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
        >
            <Card 
                // UPDATED: Main click action navigates to the edit page
                onClick={() => navigate(`/invoices/edit/${invoice.invoice_id}`)}
                sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2, 
                    p: 2, 
                    borderRadius: theme.shape.borderRadiusLG, 
                    cursor: 'pointer',
                    '&:hover': {
                        boxShadow: theme.shadows[6],
                        borderColor: 'primary.main',
                    },
                    border: '1px solid transparent',
                    transition: 'box-shadow 0.3s ease, border-color 0.3s ease'
                }}
            >
                <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} sm={4} md={3}>
                        <Typography fontWeight={600}>{invoice.client_name}</Typography>
                        <Typography variant="body2" color="text.secondary">#{invoice.invoice_number}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={2} md={2}>
                        <Chip icon={status.icon} label={status.label} color={status.color} size="small" sx={{fontWeight: 500}} />
                    </Grid>
                     <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="body2" color="text.secondary">Due: {new Date(invoice.due_date).toLocaleDateString()}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={3} md={3}>
                        <Typography variant="h6" fontWeight={700} textAlign={{xs: 'left', sm: 'right'}}>${parseFloat(invoice.total_amount).toFixed(2)}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                        {/* UPDATED: This button now explicitly opens the public view */}
                        <Tooltip title="View Public Link">
                            <IconButton onClick={handleViewPublic}>
                                <ExternalLink size={20} />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                </Grid>
            </Card>
        </motion.div>
    );
};

export const InvoicesPage = () => {
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const navigate = useNavigate();
  const theme = useTheme();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const data = await getData('invoices');
        setAllInvoices(data);
      } catch (err) {
        setError('Failed to fetch invoices.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);
  
  const filteredInvoices = useMemo(() => {
      return allInvoices.filter(invoice => {
          const searchMatch = debouncedSearchTerm ? (
              invoice.client_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
              invoice.invoice_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
          ) : true;

          const statusMatch = statusFilter !== 'all' ? invoice.status === statusFilter : true;
          
          return searchMatch && statusMatch;
      });
  }, [allInvoices, debouncedSearchTerm, statusFilter]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h4" fontWeight={700}>
            Invoices
            </Typography>
            <Button variant="contained" color="secondary" size="large" startIcon={<Plus />} onClick={() => navigate('/invoices/new')}>
            Create New Invoice
            </Button>
        </Box>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
        <Paper elevation={2} sx={{ p: 2, mb: 4, borderRadius: theme.shape.borderRadiusLG }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        placeholder="Search by client or invoice #"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                            <InputAdornment position="start">
                                <Search size={20} color={theme.palette.text.secondary} />
                            </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                     <ToggleButtonGroup
                        value={statusFilter}
                        exclusive
                        onChange={(e, newStatus) => {if(newStatus) setStatusFilter(newStatus)}}
                        aria-label="invoice status filter"
                        fullWidth
                     >
                        <ToggleButton value="all">All</ToggleButton>
                        <ToggleButton value="sent">Sent</ToggleButton>
                        <ToggleButton value="paid">Paid</ToggleButton>
                        <ToggleButton value="overdue">Overdue</ToggleButton>
                        <ToggleButton value="draft">Draft</ToggleButton>
                    </ToggleButtonGroup>
                </Grid>
            </Grid>
        </Paper>
      </motion.div>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <AnimatePresence>
            {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                    <InvoiceCard key={invoice.invoice_id} invoice={invoice} navigate={navigate} />
                ))
            ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <FileText size={48} opacity={0.5}/>
                        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>No Invoices Found</Typography>
                        <Typography color="text.secondary">
                            {allInvoices.length > 0 ? "No invoices match your current filters." : "You haven't created any invoices yet."}
                        </Typography>
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
      )}
    </Container>
  );
};