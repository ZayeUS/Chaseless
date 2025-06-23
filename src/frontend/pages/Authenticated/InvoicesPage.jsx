// File: src/frontend/pages/Authenticated/InvoicesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Container, CircularProgress, Alert,
  Grid, Card, Chip, useTheme, TextField, InputAdornment,
  ToggleButton, ToggleButtonGroup, Tooltip, IconButton,
  Paper, Snackbar, Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileText, CheckCircle2, Mail,
  AlertTriangle, ExternalLink, Send, Edit
} from 'lucide-react';
import { getData, putData } from '../../utils/BackendRequestHelper';
import { useDebounce } from '../../utils/useDebounce';

const statusStyles = {
  paid:    { label: 'Paid',    color: 'success', icon: <CheckCircle2 size={18}/> },
  sent:    { label: 'Sent',    color: 'info',    icon: <Mail        size={18}/> },
  overdue: { label: 'Overdue', color: 'error',   icon: <AlertTriangle size={18}/> },
  draft:   { label: 'Draft',   color: 'default', icon: <FileText    size={18}/> },
};

const InvoiceCard = ({ invoice, navigate, onSend, sendingId }) => {
  const theme = useTheme();
  const status = statusStyles[invoice.status] || {
    label: invoice.status, color: 'default', icon: <FileText size={18}/>
  };
  const isSending = sendingId === invoice.invoice_id;

  const handleViewPublic = (e) => {
    e.stopPropagation();
    window.open(`/invoice/${invoice.invoice_id}`, '_blank');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <Card
        sx={{
          mb: 3,
          p: 3,
          borderRadius: theme.shape.borderRadiusXL,
          boxShadow: theme.shadows[3],
          border: '1px solid',
          borderColor: theme.palette.divider,
          '&:hover': {
            boxShadow: theme.shadows[6],
            borderColor: theme.palette.primary.main,
            cursor: 'pointer',
          },
        }}
        onClick={() => navigate(`/invoices/${invoice.invoice_id}`)}
      >
        <Grid container alignItems="center">
          <Grid item xs={12} sm={8}>
            <Stack spacing={1}>
              <Typography variant="h6" fontWeight={600}>
                {invoice.client_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Invoice #{invoice.invoice_number}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip
                  icon={status.icon}
                  label={status.label}
                  color={status.color}
                  size="small"
                  sx={{ fontWeight: 500 }}
                />
                <Typography variant="body2" color="text.secondary">
                  Due {new Date(invoice.due_date).toLocaleDateString()}
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  ${parseFloat(invoice.total_amount).toFixed(2)}
                </Typography>
              </Stack>
            </Stack>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {invoice.status === 'draft' && (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  onClick={(e) => { e.stopPropagation(); onSend(invoice.invoice_id); }}
                  disabled={isSending}
                  startIcon={isSending
                    ? <CircularProgress size={16} color="inherit" />
                    : <Send size={16} />}
                >
                  Send
                </Button>
              )}
              <Tooltip title="Edit Invoice">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); navigate(`/invoices/${invoice.invoice_id}`); }}
                >
                  <Edit size={20}/>
                </IconButton>
              </Tooltip>
              <Tooltip title="View Public Link">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleViewPublic(e); }}
                >
                  <ExternalLink size={20}/>
                </IconButton>
              </Tooltip>
            </Box>
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
  const [notification, setNotification] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sendingId, setSendingId] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await getData('invoices');
      setAllInvoices(data);
    } catch {
      setError('Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleSendInvoice = async (invoiceId) => {
    setSendingId(invoiceId);
    setError(null);
    try {
      await putData(`invoices/${invoiceId}/status`, { status: 'sent' });
      setNotification('Invoice sent successfully!');
      fetchInvoices();
    } catch {
      setError('Failed to send invoice. Please try again.');
    } finally {
      setSendingId(null);
    }
  };

  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(inv => {
      const term = debouncedSearchTerm.toLowerCase();
      const matchesSearch = !term || inv.client_name.toLowerCase().includes(term) ||
        inv.invoice_number.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allInvoices, debouncedSearchTerm, statusFilter]);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification('')}
        message={notification}
      />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" fontWeight={700}>Invoices</Typography>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            startIcon={<Plus />}
            onClick={() => navigate('/invoices/new')}
          >
            Create New Invoice
          </Button>
        </Box>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
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
                      <Search size={20} color={theme.palette.text.secondary}/>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(_, v) => v && setStatusFilter(v)}
                fullWidth
                size="small"
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <AnimatePresence>
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map(inv => (
              <InvoiceCard
                key={inv.invoice_id}
                invoice={inv}
                navigate={navigate}
                onSend={handleSendInvoice}
                sendingId={sendingId}
              />
            ))
          ) : (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FileText size={48} opacity={0.5}/>
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                  {allInvoices.length > 0
                    ? 'No invoices match your current filters.'
                    : "You haven't created any invoices yet."
                  }
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Container>
  );
};

export default InvoicesPage;
