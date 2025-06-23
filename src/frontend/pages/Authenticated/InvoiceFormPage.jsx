// File: src/frontend/pages/Authenticated/InvoiceFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, Container, Paper, CircularProgress, Alert,
  Grid, TextField, Autocomplete, IconButton, Divider, useTheme, Card, CardContent, Tooltip, InputAdornment
} from '@mui/material';
import { motion } from 'framer-motion';
import { Plus, Trash2, Save, ArrowLeft, Calendar, Hash } from 'lucide-react';
import { getData, postData, putData } from '../../utils/BackendRequestHelper';
import { useUserStore } from '../../store/userStore';

const today = new Date().toISOString().split('T')[0];

const LineItemRow = ({ item, index, handleItemChange, removeItem, canRemove }) => {
    return (
        <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                <Grid item xs={12} sm={6}><TextField label="Description" placeholder="Service or Product" fullWidth value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} /></Grid>
                <Grid item xs={6} sm={2}><TextField label="Quantity" type="number" fullWidth value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} inputProps={{ min: 0 }} /></Grid>
                <Grid item xs={6} sm={3}><TextField label="Unit Price" type="number" fullWidth value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} inputProps={{ min: 0, step: "0.01" }} /></Grid>
                <Grid item xs={12} sm={1} sx={{ textAlign: 'right' }}><Tooltip title="Remove Item"><span><IconButton onClick={() => removeItem(index)} color="error" disabled={!canRemove}><Trash2 size={20} /></IconButton></span></Tooltip></Grid>
            </Grid>
        </motion.div>
    );
};

export const InvoiceFormPage = () => {
  const { invoiceId } = useParams();
  const isEditing = !!invoiceId;
  const navigate = useNavigate();
  const theme = useTheme();
  
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: '' }]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { setLoading: setStoreLoading, loading: formLoading } = useUserStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const clientData = await getData('clients');
        setClients(clientData);

        if (isEditing) {
          const invoiceData = await getData(`invoices/${invoiceId}`);
          setInvoiceNumber(invoiceData.invoice_number);
          setIssueDate(new Date(invoiceData.issue_date).toISOString().split('T')[0]);
          setDueDate(new Date(invoiceData.due_date).toISOString().split('T')[0]);
          setItems(invoiceData.items);
          setNotes(invoiceData.notes || '');
          setStatus(invoiceData.status);
          const currentClient = clientData.find(c => c.client_id === invoiceData.client_id);
          if (currentClient) setSelectedClient(currentClient);
        } else {
          const numberData = await getData('invoices/next-number');
          setInvoiceNumber(numberData.nextInvoiceNumber);
          const date = new Date();
          date.setDate(date.getDate() + 30);
          setDueDate(date.toISOString().split('T')[0]);
        }
      } catch (err) {
        setError('Could not load required data. Please try again.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [invoiceId, isEditing]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: '' }]);
  const removeItem = (index) => items.length > 1 && setItems(items.filter((_, i) => i !== index));
  const calculateTotal = () => items.reduce((total, item) => total + ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)), 0).toFixed(2);

  const handleSubmit = async () => {
    setError('');
    if (!selectedClient || items.some(item => !item.description || !item.unit_price)) {
      setError('Please select a client and ensure all line items have a description and price.');
      return;
    }
    
    setStoreLoading(true);
    try {
      const payload = {
        client_id: selectedClient.client_id,
        issue_date: issueDate,
        due_date: dueDate,
        items: items.filter(item => item.description && item.unit_price),
        notes: notes,
        status: status, // Include status for editing
      };
      
      if (isEditing) {
        await putData(`invoices/${invoiceId}`, payload);
      } else {
        await postData('invoices', payload);
      }
      navigate('/invoices');

    } catch (err) {
      setError(err.message || 'An error occurred while saving the invoice.');
    } finally {
      setStoreLoading(false);
    }
  };

  if (loading) {
    return <Container maxWidth="md" sx={{ py: 5, textAlign: 'center' }}><CircularProgress /><Typography sx={{mt: 2}}>Loading Form...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Button startIcon={<ArrowLeft />} onClick={() => navigate('/invoices')} sx={{ mb: 1 }}>Back to Invoices</Button>
        <Typography variant="h4" fontWeight={700}>{isEditing ? `Edit Invoice #${invoiceNumber}` : 'Create New Invoice'}</Typography>
      </motion.div>
      
      <Grid container spacing={4} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Paper elevation={2} sx={{ p: { xs: 2, md: 4 }, borderRadius: theme.shape.borderRadiusLG }}>
              <Box><Typography variant="h6" fontWeight={600} gutterBottom>Client Information</Typography><Autocomplete options={clients} getOptionLabel={(option) => option.name || ''} value={selectedClient} onChange={(e, v) => setSelectedClient(v)} isOptionEqualToValue={(o, v) => o.client_id === v.client_id} renderInput={(params) => <TextField {...params} label="Select a Client" required/>}/></Box>
              <Divider sx={{ my: 4 }}><Typography variant="overline">Line Items</Typography></Divider>
              <Box>{items.map((item, index) => (<LineItemRow key={index} item={item} index={index} handleItemChange={handleItemChange} removeItem={removeItem} canRemove={items.length > 1}/>))}<Button startIcon={<Plus size={16} />} onClick={addItem} sx={{ mt: 1 }}>Add Line Item</Button></Box>
              <Divider sx={{ my: 4 }} />
              <Box><Typography variant="h6" fontWeight={600} gutterBottom>Notes</Typography><TextField label="Optional notes for the client..." multiline rows={4} fullWidth value={notes} onChange={e => setNotes(e.target.value)} /></Box>
            </Paper>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                <Card elevation={2} sx={{ borderRadius: theme.shape.borderRadiusLG, position: 'sticky', top: '88px' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>Invoice Details</Typography>
                        <Grid container spacing={2}>
                             <Grid item xs={12}><TextField label="Invoice Number" value={invoiceNumber} fullWidth disabled InputProps={{ startAdornment: <InputAdornment position="start"><Hash size={16}/></InputAdornment> }}/></Grid>
                             <Grid item xs={12}><TextField label="Issue Date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} fullWidth required InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={16}/></InputAdornment> }}/></Grid>
                             <Grid item xs={12}><TextField label="Due Date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} fullWidth required InputProps={{ startAdornment: <InputAdornment position="start"><Calendar size={16}/></InputAdornment> }}/></Grid>
                        </Grid>
                        <Divider sx={{ my: 3 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><Typography variant="h6">Total Amount:</Typography><Typography variant="h4" fontWeight={700} color="secondary.main">${calculateTotal()}</Typography></Box>
                        <Box sx={{ mt: 3 }}>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}<Button fullWidth variant="contained" color="secondary" size="large" startIcon={<Save />} onClick={handleSubmit} disabled={formLoading} sx={{ py: 1.5 }}>{formLoading ? <CircularProgress size={24} color="inherit"/> : 'Save Invoice'}</Button></Box>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};