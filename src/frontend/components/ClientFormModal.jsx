// File: src/frontend/components/ClientFormModal.jsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, CircularProgress, Alert
} from '@mui/material';

export const ClientFormModal = ({ open, onClose, onSave, client, loading }) => {
  const [formData, setFormData] = useState({ name: '', email: '', address: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (client) {
      setFormData({ name: client.name, email: client.email, address: client.address || '' });
    } else {
      setFormData({ name: '', email: '', address: '' });
    }
    setErrors({}); // Reset errors when modal opens or client changes
  }, [client, open]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Client name is required.";
    if (!formData.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Please enter a valid email address.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle fontWeight="bold">{client ? 'Edit Client' : 'Add New Client'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              autoFocus
              name="name"
              label="Client or Company Name"
              fullWidth
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="email"
              label="Contact Email"
              fullWidth
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              name="address"
              label="Address (Optional)"
              fullWidth
              multiline
              rows={3}
              value={formData.address}
              onChange={handleChange}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: '0 24px 16px' }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Save Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};