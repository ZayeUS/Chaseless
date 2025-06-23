// File: src/frontend/pages/Public/PublicInvoicePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Button,
  Chip,
  Avatar,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider
} from '@mui/material';
import { createAppTheme } from '../../styles/theme';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  XCircle
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

function SummaryCard({ invoice, onDownload, onPay, payLoading }) {
  const baseAmount   = parseFloat(invoice.total_amount);
  const feeAmount    = +(baseAmount * 0.03).toFixed(2);
  const totalWithFee = +(baseAmount + feeAmount).toFixed(2);

  const isPayable = ['sent','overdue','draft'].includes(invoice.status);
  const disabledReason =
    invoice.status === 'paid' ? 'Already paid.' :
    invoice.status === 'void' ? 'This invoice is void.' :
    'Cannot be paid at this time.';

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }}>
      <Paper elevation={3} sx={{ p:3, borderRadius:2, position:'sticky', top:88, border:'1px solid #e0e0e0' }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Summary</Typography>

        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography color="text.secondary">Subtotal</Typography>
          <Typography>${baseAmount.toFixed(2)}</Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography color="text.secondary">3% Processing Fee</Typography>
          <Typography>${feeAmount.toFixed(2)}</Typography>
        </Box>
        <Divider />
        <Box display="flex" justifyContent="space-between" my={2}>
          <Typography variant="h6">Total Due</Typography>
          <Typography variant="h5" fontWeight={700} color="secondary.main">
            ${totalWithFee.toFixed(2)}
          </Typography>
        </Box>
        <Divider sx={{ my:2 }} />

        <Box display="flex" flexDirection="column" gap={1.5}>
          <Tooltip title={!isPayable ? disabledReason : ''}>
            <span>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={payLoading
                  ? <CircularProgress size={20} color="inherit"/>
                  : <CreditCard size={18}/>}
                onClick={onPay}
                disabled={!isPayable||payLoading}
                sx={{ py:1.5 }}
              >
                {payLoading ? 'Processing...' : `Pay $${totalWithFee.toFixed(2)}`}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            startIcon={<Download size={18}/>}
            onClick={onDownload}
          >
            Download PDF
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
          Online payments incur a 3% processing fee.<br/>
          To pay by check, please contact us directly.
        </Typography>
      </Paper>
    </motion.div>
  );
}

export const PublicInvoicePage = () => {
  const { invoiceId } = useParams();
  const location      = useLocation();

  const [invoice, setInvoice]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [payLoading, setPayLoading]         = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('payment_success') === 'true') {
      setPaymentSuccess(true);
    }
    (async () => {
      if (!invoiceId) {
        setError('No invoice ID provided.');
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
    })();
  }, [invoiceId, location.search]);

  const handlePay = async () => {
    setPayLoading(true);
    setError('');
    try {
      const base = parseFloat(invoice.total_amount);
      const unit_amount = Math.round(base * 1.03 * 100);
      const { url } = await postData('stripe-connect/create-invoice-checkout', {
        invoiceId,
        unit_amount,
        description: `Invoice #${invoice.invoice_number} (incl. 3% fee)`
      });
      if (!url) throw new Error();
      window.location.href = url;
    } catch {
      setError('Could not initiate payment. Please contact the sender.');
      setPayLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloadLoading(true);
    try {
      const base = parseFloat(invoice.total_amount);
      const unit_amount = Math.round(base * 1.03 * 100);
      const { url } = await postData('stripe-connect/create-invoice-checkout', {
        invoiceId,
        unit_amount,
        description: `Invoice #${invoice.invoice_number} (incl. 3% fee)`
      });
      await generateInvoicePdf(invoice, url);
    } catch (err) {
      console.error(err);
      setError('Could not generate PDF. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={createAppTheme('light')}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="#F7FAFC">
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (error && !invoice) {
    return (
      <ThemeProvider theme={createAppTheme('light')}>
        <Container maxWidth="sm" sx={{ py:5 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  const currentStatus = statusStyles[invoice.status] || {
    label: invoice.status.toUpperCase(),
    color: 'default',
    icon: <FileText size={20}/>
  };

  return (
    <ThemeProvider theme={createAppTheme('light')}>
      <Box bgcolor="#F7FAFC" minHeight="100vh" py={{ xs:3, md:6 }}>
        <Container maxWidth="lg">
          {paymentSuccess && (
            <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}>
              <Alert severity="success" sx={{ mb:3, borderRadius:2 }}>
                <Typography fontWeight={600}>Payment Successful!</Typography>
                Thank you for your payment. A receipt has been sent to your email.
              </Alert>
            </motion.div>
          )}
          {error && !payLoading && <Alert severity="error" sx={{ mb:3 }}>{error}</Alert>}

          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}>
                <Paper elevation={3} sx={{ p:{ xs:3, sm:5 }, borderRadius:2, border:'1px solid #E2E8F0' }}>
                  <Grid container justifyContent="space-between" alignItems="flex-start" spacing={2} mb={4}>
                    <Grid item>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar src={invoice.user_avatar_url} sx={{ width:56, height:56 }}/>
                        <Box>
                          <Typography variant="body2" color="text.secondary">INVOICE FROM</Typography>
                          <Typography variant="h6" fontWeight={600}>
                            {invoice.user_first_name} {invoice.user_last_name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item textAlign="right">
                      <Typography variant="h4" fontWeight={700}>Invoice</Typography>
                      <Typography color="text.secondary">#{invoice.invoice_number}</Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ mb:4 }}/>

                  <Grid container spacing={4} mb={5}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
                        BILLED TO
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>{invoice.client_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{invoice.client_email}</Typography>
                      {invoice.client_address && (
                        <Typography variant="body2" color="text.secondary">{invoice.client_address}</Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6} textAlign={{ sm:'right' }}>
                      <Chip icon={currentStatus.icon} label={currentStatus.label} color={currentStatus.color} sx={{ fontWeight:600, mb:1 }}/>
                      <Typography>Issue Date: {new Date(invoice.issue_date).toLocaleDateString()}</Typography>
                      <Typography fontWeight={600}>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</Typography>
                    </Grid>
                  </Grid>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor:'#EDF2F7' }}>
                          <TableCell>Description</TableCell>
                          <TableCell align="right">Qty</TableCell>
                          <TableCell align="right">Rate</TableCell>
                          <TableCell align="right">Amount</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoice.items.map(item => (
                          <TableRow key={item.item_id}>
                            <TableCell fontWeight={500}>{item.description}</TableCell>
                            <TableCell align="right">{parseFloat(item.quantity)}</TableCell>
                            <TableCell align="right">${parseFloat(item.unit_price).toFixed(2)}</TableCell>
                            <TableCell align="right">${(parseFloat(item.quantity)*parseFloat(item.unit_price)).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box display="flex" justifyContent="flex-end" mt={4}>
                    <Box width={{ xs:'100%', sm:300 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography color="text.secondary">Subtotal</Typography>
                        <Typography>${invoice.total_amount}</Typography>
                      </Box>
                      <Divider sx={{ my:1 }}/>
                      <Box display="flex" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="h6" fontWeight={600}>Total Due</Typography>
                        <Typography variant="h5" fontWeight={700} color="primary.main">${invoice.total_amount}</Typography>
                      </Box>
                    </Box>
                  </Box>

                  {invoice.notes && (
                    <Box mt={5} pt={3} borderTop="1px solid #E2E8F0">
                      <Typography variant="body1" color="text.secondary" fontWeight={600}>Notes</Typography>
                      <Typography variant="body2" color="text.secondary" mt={1}>{invoice.notes}</Typography>
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

          <Typography variant="caption" display="block" textAlign="center" color="text.secondary" mt={5}>
            Powered by ChaseLess — Effortless Invoicing
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
};
