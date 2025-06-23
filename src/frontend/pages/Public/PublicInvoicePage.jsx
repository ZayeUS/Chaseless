// File: src/frontend/pages/Public/PublicInvoicePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box, Typography, Container, Paper, CircularProgress, Alert,
  Grid, Divider, Button, useTheme, alpha, Chip, Avatar, Tooltip
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  CreditCard, Download,
  CheckCircle, AlertCircle,
  Clock, FileText, XCircle
} from 'lucide-react';
import { getData, postData } from '../../utils/BackendRequestHelper';
import { generateInvoicePdf } from '../../utils/pdfGenerator';

const statusStyles = {
  paid:    { label: 'Paid',    color: 'success', icon: <CheckCircle size={20}/> },
  sent:    { label: 'Sent',    color: 'info',    icon: <Clock       size={20}/> },
  overdue: { label: 'Overdue', color: 'error',   icon: <AlertCircle size={20}/> },
  draft:   { label: 'Draft',   color: 'default', icon: <FileText    size={20}/> },
  void:    { label: 'Void',    color: 'default', icon: <XCircle     size={20}/> },
};

const SummaryCard = ({ invoice, onDownload, onPay, payLoading }) => {
  const theme = useTheme();
  const isPayable = ['sent', 'overdue', 'draft'].includes(invoice.status);
  const getDisabledReason = () => {
    if (invoice.status === 'paid') return 'This invoice has already been paid.';
    if (invoice.status === 'void') return 'This invoice has been voided.';
    return 'This invoice cannot be paid at this time.';
  };

  const amountDue = parseFloat(invoice.total_amount).toFixed(2);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
      <Paper elevation={4} sx={{ p: 3, borderRadius: theme.shape.borderRadiusLG, position: 'sticky', top: '88px' }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Summary</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography color="text.secondary">Amount Due:</Typography>
          <Typography variant="h5" fontWeight={700}>${amountDue}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="text.secondary">Due Date:</Typography>
          <Typography fontWeight={500}>{new Date(invoice.due_date).toLocaleDateString()}</Typography>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Tooltip title={!isPayable ? getDisabledReason() : ''}>
            <span>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={
                  payLoading
                    ? <CircularProgress size={20} color="inherit" />
                    : <CreditCard size={18} />
                }
                onClick={onPay}
                disabled={!isPayable || payLoading}
              >
                {payLoading ? 'Processing...' : 'Pay Invoice'}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<Download size={18} />}
            onClick={onDownload}
          >
            Download PDF
          </Button>
        </Box>
      </Paper>
    </motion.div>
  );
};

export const PublicInvoicePage = () => {
  const { invoiceId } = useParams();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    if (qp.get('payment_success') === 'true') {
      setPaymentSuccess(true);
    }

    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError("No invoice ID provided.");
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getData(`invoices/public/${invoiceId}`);
        setInvoice(data);
      } catch (err) {
        setError(err.message || 'Could not load the invoice.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId, location.search]);

  const handlePay = async () => {
    setPayLoading(true);
    setError('');
    try {
      const { url } = await postData('stripe-connect/create-invoice-checkout', { invoiceId });
      if (!url) throw new Error();
      window.location.href = url;
    } catch {
      setError("Could not initiate payment; check seller setup.");
      setPayLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    // Try to get a Checkout URL for embedding
    let paymentUrl = null;
    if (['sent', 'overdue', 'draft'].includes(invoice.status)) {
      try {
        const { url } = await postData('stripe-connect/create-invoice-checkout', { invoiceId });
        paymentUrl = url;
      } catch {
        // ignore
      }
    }
    generateInvoicePdf(invoice, window.location.origin, paymentUrl);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: theme.palette.background.default }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error && !invoice) {
    return <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="error">{error}</Alert></Container>;
  }
  if (!invoice) {
    return <Container maxWidth="sm" sx={{ py: 5 }}><Alert severity="warning">Invoice not found.</Alert></Container>;
  }

  const currentStatus = statusStyles[invoice.status] || {
    label: invoice.status.toUpperCase(),
    color: 'default',
    icon: <FileText size={20}/>
  };

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 3, md: 6 } }}>
      <Container maxWidth="lg">
        {paymentSuccess && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: theme.shape.borderRadiusLG }}>
              <Typography fontWeight={600}>Payment Successful!</Typography>
              Thank you for your payment.
            </Alert>
          </motion.div>
        )}
        {error && !payLoading && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <Paper elevation={4} sx={{
                borderRadius: theme.shape.borderRadiusLG,
                p: { xs: 3, sm: 5 },
                minHeight: '100%',
                bgcolor: alpha(theme.palette.background.paper, 0.95),
                backdropFilter: 'blur(8px)'
              }}>
                <Grid container justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 4 }}>
                  <Grid item>
                    <Typography variant="h4" fontWeight={700}>Invoice</Typography>
                    <Chip icon={currentStatus.icon} label={currentStatus.label} color={currentStatus.color} size="small" sx={{ mt: 1, fontWeight: 600 }} />
                  </Grid>
                  <Grid item sx={{ textAlign: 'right' }}>
                    <Typography color="text.secondary" variant="body2">FROM</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1.5 }}>
                      <Avatar src={invoice.user_avatar_url} sx={{ width: 32, height: 32 }} />
                      <Typography variant="h6">{invoice.user_first_name} {invoice.user_last_name}</Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Divider sx={{ mb: 4 }} />

                <Grid container spacing={4} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                      BILLED TO
                    </Typography>
                    <Typography variant="h6" fontWeight={500}>{invoice.client_name}</Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 4, mb: 4, borderRadius: 1, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
                  <Box sx={{ bgcolor: 'action.hover', p: 1.5, display: { xs: 'none', md: 'block' } }}>
                    <Grid container>
                      <Grid item md={6}><Typography variant="body2" fontWeight={600}>Description</Typography></Grid>
                      <Grid item md={2} textAlign="right"><Typography variant="body2" fontWeight={600}>Quantity</Typography></Grid>
                      <Grid item md={2} textAlign="right"><Typography variant="body2" fontWeight={600}>Unit Price</Typography></Grid>
                      <Grid item md={2} textAlign="right"><Typography variant="body2" fontWeight={600}>Total</Typography></Grid>
                    </Grid>
                  </Box>
                  {invoice.items.map((item, idx) => {
                    const qty   = parseFloat(item.quantity).toFixed(2);
                    const price = parseFloat(item.unit_price).toFixed(2);
                    const total = (parseFloat(item.quantity) * parseFloat(item.unit_price)).toFixed(2);
                    return (
                      <Box key={item.item_id} sx={{ borderBottom: idx === invoice.items.length - 1 ? 'none' : `1px solid ${theme.palette.divider}` }}>
                        <Grid container alignItems="center" sx={{ p: 1.5 }}>
                          <Grid item xs={12} md={6}><Typography fontWeight={500}>{item.description}</Typography></Grid>
                          <Grid item xs={4} md={2} textAlign={{ xs: 'left', md: 'right' }}>
                            <Typography><Box component="span" sx={{ display: { md: 'none' } }}>Qty:&nbsp;</Box>{qty}</Typography>
                          </Grid>
                          <Grid item xs={4} md={2} textAlign={{ xs: 'left', md: 'right' }}>
                            <Typography><Box component="span" sx={{ display: { md: 'none' } }}>Price:&nbsp;</Box>${price}</Typography>
                          </Grid>
                          <Grid item xs={4} md={2} textAlign="right">
                            <Typography fontWeight={{ xs: 600, md: 'normal' }}>${total}</Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}
                </Box>

                {invoice.notes && (
                  <Box sx={{ mt: 4, pt: 3, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>Notes</Typography>
                    <Typography variant="body2" color="text.secondary" fontStyle="italic">{invoice.notes}</Typography>
                  </Box>
                )}
              </Paper>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={4}>
            <SummaryCard
              invoice={invoice}
              onDownload={handleDownload}
              onPay={handlePay}
              payLoading={payLoading}
            />
          </Grid>
        </Grid>

        <Typography variant="caption" display="block" textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
          Powered by ChaseLess
        </Typography>
      </Container>
    </Box>
  );
};
