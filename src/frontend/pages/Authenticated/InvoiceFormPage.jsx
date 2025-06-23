// File: src/frontend/pages/Authenticated/InvoiceFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Container, Paper, CircularProgress, Alert,
  Grid, TextField, Autocomplete, IconButton, Divider, Card,
  CardContent, InputAdornment, FormControl, InputLabel, Select, MenuItem,
  Switch, FormControlLabel, Chip, Collapse, Tooltip, Stack
} from '@mui/material';
import { 
  Plus, Trash2, Save, ArrowLeft, Calendar, Hash, Send, Eye,
  Info, Bell, RotateCcw, MessageCircle, CheckCircle2
} from 'lucide-react';
import { getData, postData, putData } from '../../utils/BackendRequestHelper';
import { useUserStore } from '../../store/userStore';

const today = new Date().toISOString().split('T')[0];

export const InvoiceFormPage = () => {
  const { invoiceId } = useParams();
  const isEditing = Boolean(invoiceId);
  const navigate = useNavigate();
  const { setLoading: setAppLoading, loading: formLoading } = useUserStore();
  
  // Core invoice state
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '' }]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Follow-up state
  const [autoFollowupsEnabled, setAutoFollowupsEnabled] = useState(false);
  const [viewReminderDays, setViewReminderDays] = useState('');
  const [dueReminderDays, setDueReminderDays] = useState('');
  const [repeatIntervalDays, setRepeatIntervalDays] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('');

  const presetTemplates = [
    "Hi {{client_name}}, just a friendly reminder about invoice #{{invoice_number}}. Thanks!",
    "Hello! Invoice #{{invoice_number}} is now {{days_overdue}} days overdue. Please review when convenient.",
    "Quick reminder: Invoice #{{invoice_number}} for ${{amount}} is pending payment."
  ];

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const clientData = await getData('clients');
        setClients(clientData);

        if (isEditing) {
          const inv = await getData(`invoices/${invoiceId}`);
          setInvoiceNumber(inv.invoice_number);
          setIssueDate(inv.issue_date);
          setDueDate(inv.due_date);
          setItems(inv.items);
          setNotes(inv.notes || '');
          setStatus(inv.status);
          setSelectedClient(clientData.find(c => c.client_id === inv.client_id) || null);

          const rules = await getData(`invoices/${invoiceId}/rules`);
          setAutoFollowupsEnabled(rules.auto_followups_enabled);
          setViewReminderDays(rules.view_reminder_days || '');
          setDueReminderDays(rules.due_reminder_days || '');
          setRepeatIntervalDays(rules.repeat_interval_days || '');
          setMessageTemplate(rules.followup_message_template || '');
        } else {
          const num = await getData('invoices/next-number');
          setInvoiceNumber(num.nextInvoiceNumber);
          const d = new Date(); 
          d.setDate(d.getDate() + 30);
          setDueDate(d.toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load form data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [invoiceId, isEditing]);

  const calculateTotal = () =>
    items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0).toFixed(2);

  const handleItemChange = (idx, field, val) => {
    const arr = [...items]; 
    arr[idx][field] = val; 
    setItems(arr);
  };
  
  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: '' }]);
  const removeItem = idx => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (action = 'save') => {
    if (!selectedClient || items.some(i => !i.description || !i.unit_price)) {
      setError('Client & all line-items must be filled out.');
      return;
    }
    setError('');
    setAppLoading(true);

    const payload = {
      client_id: selectedClient.client_id,
      issue_date: issueDate,
      due_date: dueDate,
      items,
      notes,
      status: action === 'send' && status === 'draft' ? 'sent' : status,
      auto_followups_enabled: autoFollowupsEnabled,
      view_reminder_days: viewReminderDays || null,
      due_reminder_days: dueReminderDays || null,
      repeat_interval_days: repeatIntervalDays || null,
      followup_message_template: messageTemplate || null
    };

    try {
      if (isEditing) {
        await putData(`invoices/${invoiceId}`, payload);
      } else {
        await postData('invoices', payload);
      }
      navigate('/invoices');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Save failed.');
    } finally {
      setAppLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!autoFollowupsEnabled) return 'default';
    const hasSettings = viewReminderDays || dueReminderDays || repeatIntervalDays;
    return hasSettings ? 'success' : 'warning';
  };

  const getStatusText = () => {
    if (!autoFollowupsEnabled) return 'Disabled';
    const hasSettings = viewReminderDays || dueReminderDays || repeatIntervalDays;
    return hasSettings ? 'Active' : 'Needs Setup';
  };

  if (loading) {
    return (
      <Container sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
        <Typography mt={2}>Loading…</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Button startIcon={<ArrowLeft />} onClick={() => navigate('/invoices')} sx={{ mb: 2 }}>
        Back to Invoices
      </Button>
      <Typography variant="h4" gutterBottom>
        {isEditing ? `Edit Invoice #${invoiceNumber}` : 'Create Invoice'}
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={4}>
        {/* LEFT: Main Form */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            {/* Client */}
            <Typography variant="h6" gutterBottom>Client</Typography>
            <Autocomplete
              options={clients}
              getOptionLabel={o => o.name}
              value={selectedClient}
              onChange={(_, v) => setSelectedClient(v)}
              renderInput={params => (
                <TextField {...params} label="Select Client" required />
              )}
            />
            <Divider sx={{ my: 3 }} />

            {/* Line Items */}
            <Typography variant="h6" gutterBottom>Line Items</Typography>
            {items.map((it, i) => (
              <Grid container spacing={2} alignItems="center" key={i} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Description"
                    fullWidth
                    value={it.description}
                    onChange={e => handleItemChange(i, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    label="Qty"
                    type="number"
                    fullWidth
                    value={it.quantity}
                    onChange={e => handleItemChange(i, 'quantity', e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    label="Price"
                    type="number"
                    fullWidth
                    value={it.unit_price}
                    onChange={e => handleItemChange(i, 'unit_price', e.target.value)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton onClick={() => removeItem(i)} disabled={items.length < 2}>
                    <Trash2 />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button startIcon={<Plus />} onClick={addItem} sx={{ mb: 3 }}>Add Item</Button>

            <Divider sx={{ my: 3 }} />

            {/* Notes */}
            <Typography variant="h6" gutterBottom>Notes</Typography>
            <TextField
              label="Optional notes"
              multiline
              rows={4}
              fullWidth
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Paper>

          {/* Follow-Up Rules Box */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Bell />
                Smart Follow-ups
              </Typography>
              <Chip label={getStatusText()} color={getStatusColor()} size="small" variant="outlined" />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={autoFollowupsEnabled}
                  onChange={(e) => setAutoFollowupsEnabled(e.target.checked)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Enable automatic reminders
                  <Tooltip title="Send automatic follow-ups based on your rules">
                    <Info size={16} />
                  </Tooltip>
                </Box>
              }
            />

            <Collapse in={autoFollowupsEnabled}>
              <Box sx={{ mt: 3 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Configure automatic reminders for this invoice. Leave fields empty to skip that type.
                </Alert>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      label="Not viewed (days)"
                      type="number"
                      fullWidth
                      value={viewReminderDays}
                      onChange={(e) => setViewReminderDays(e.target.value)}
                      placeholder="3"
                      helperText="After sending"
                      InputProps={{ inputProps: { min: 1, max: 30 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      label="Overdue (days)"
                      type="number"
                      fullWidth
                      value={dueReminderDays}
                      onChange={(e) => setDueReminderDays(e.target.value)}
                      placeholder="7"
                      helperText="After due date"
                      InputProps={{ inputProps: { min: 1, max: 90 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      size="small"
                      label="Repeat (days)"
                      type="number"
                      fullWidth
                      value={repeatIntervalDays}
                      onChange={(e) => setRepeatIntervalDays(e.target.value)}
                      placeholder="14"
                      helperText="Interval"
                      InputProps={{ inputProps: { min: 1, max: 30 } }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MessageCircle size={16} />
                    Message Template
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                    {presetTemplates.map((template, index) => (
                      <Chip
                        key={index}
                        label={`Template ${index + 1}`}
                        variant="outlined"
                        size="small"
                        onClick={() => setMessageTemplate(template)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Stack>

                  <TextField
                    size="small"
                    multiline
                    rows={2}
                    fullWidth
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Hi {{client_name}}, reminder about invoice #{{invoice_number}}..."
                    helperText="Use {{client_name}}, {{invoice_number}}, {{amount}}, {{days_overdue}}"
                  />
                </Box>

                {(viewReminderDays || dueReminderDays || repeatIntervalDays) && (
                  <Alert severity="success" icon={<CheckCircle2 />} sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Rules Active:</Typography>
                    <Box sx={{ fontSize: '0.875rem', mt: 0.5 }}>
                      {viewReminderDays && `• Not viewed: ${viewReminderDays} days`}
                      {dueReminderDays && `• Overdue: ${dueReminderDays} days`}
                      {repeatIntervalDays && `• Repeat: ${repeatIntervalDays} days`}
                    </Box>
                  </Alert>
                )}
              </Box>
            </Collapse>
          </Paper>
        </Grid>

        {/* RIGHT: Details & Actions */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2, position: 'sticky', top: 88 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Details</Typography>
              <TextField
                label="Invoice #"
                fullWidth
                value={invoiceNumber}
                disabled
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Hash /></InputAdornment>
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Calendar /></InputAdornment>
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Due Date"
                type="date"
                fullWidth
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Calendar /></InputAdornment>
                }}
                sx={{ mb: 2 }}
              />
              {isEditing && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={status} onChange={e => setStatus(e.target.value)} label="Status">
                    {['draft', 'sent', 'paid', 'void'].map(s => (
                      <MenuItem key={s} value={s}>{s.toUpperCase()}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Total</Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                ${calculateTotal()}
              </Typography>
              
              <Stack spacing={1}>
                {!isEditing && (
                  <Button
                    variant="contained"
                    startIcon={<Send />}
                    onClick={() => handleSubmit('send')}
                    disabled={formLoading}
                    fullWidth
                  >
                    Save & Send
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={() => handleSubmit('save')}
                  disabled={formLoading}
                  fullWidth
                >
                  {isEditing ? 'Save Changes' : 'Save Draft'}
                </Button>
                {isEditing && (
                  <Button
                    startIcon={<Eye />}
                    onClick={() => window.open(`/invoice/${invoiceId}`, '_blank')}
                    fullWidth
                  >
                    View Public
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};