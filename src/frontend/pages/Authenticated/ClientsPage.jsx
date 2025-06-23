// File: src/frontend/pages/Authenticated/ClientsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Container, CircularProgress, Alert,
  Grid, Card, CardContent, useTheme, Avatar, TextField, InputAdornment,
  IconButton, Menu, MenuItem, alpha, Paper, Select, FormControl,
  InputLabel, Divider, Tooltip, Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Users, MoreVertical, Edit, Trash2,
  Mail, MapPin, FilePlus, Award, AlertTriangle
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getData, postData, putData, deleteData } from '../../utils/BackendRequestHelper';
import { ClientFormModal } from '../../components/ClientFormModal';
import { useDebounce } from '../../utils/useDebounce';

// --- Stat Card ---
const StatCard = ({ title, value, icon, color = 'primary.main', isCurrency = false, delay = 0 }) => {
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
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
            <Avatar sx={{ bgcolor: alpha(color, 0.15), width: 44, height: 44 }}>
              {React.cloneElement(icon, { style: { color, width: 24, height: 24 } })}
            </Avatar>
          </Stack>
          <Typography variant="h4" fontWeight={700} sx={{ color }}>
            {isCurrency ? '$' : ''}{value}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- Client Card ---
const ClientCard = ({ client, onEdit, onDelete, onNewInvoice }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const avatarColor = useMemo(() => {
    let hash = 0;
    client.name.split('').forEach(ch => {
      hash = ch.charCodeAt(0) + ((hash << 5) - hash);
    });
    let col = '#';
    for (let i = 0; i < 3; i++) {
      const part = (hash >> (i * 8)) & 0xff;
      col += part.toString(16).padStart(2, '0');
    }
    return col;
  }, [client.name]);

  return (
    <Grid item xs={12} sm={6} md={4}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          onClick={() => onNewInvoice(client)}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: theme.shape.borderRadiusLG,
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: theme.shadows[8],
              cursor: 'pointer'
            }
          }}
          elevation={3}
        >
          <CardContent sx={{ flexGrow: 1, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Avatar
                sx={{
                  bgcolor: alpha(avatarColor, 0.7),
                  color: theme.palette.getContrastText(avatarColor),
                  width: 56,
                  height: 56,
                  fontSize: '1.5rem'
                }}
              >
                {client.name.charAt(0).toUpperCase()}
              </Avatar>
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertical size={20} />
              </IconButton>
              <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                <MenuItem onClick={() => { onNewInvoice(client); handleMenuClose(); }}>
                  <FilePlus size={16} style={{ marginRight: 8 }} /> New Invoice
                </MenuItem>
                <MenuItem onClick={() => { onEdit(client); handleMenuClose(); }}>
                  <Edit size={16} style={{ marginRight: 8 }} /> Edit
                </MenuItem>
                <Divider />
                <MenuItem onClick={() => { onDelete(client.client_id); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                  <Trash2 size={16} style={{ marginRight: 8 }} /> Delete
                </MenuItem>
              </Menu>
            </Box>
            <Typography variant="h6" fontWeight={600} noWrap>
              {client.name}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} mt={1} color="text.secondary">
              <Mail size={16} /><Typography variant="body2" noWrap>{client.email}</Typography>
            </Stack>
            {client.address && (
              <Stack direction="row" alignItems="center" spacing={1} mt={0.5} color="text.secondary">
                <MapPin size={16} /><Typography variant="body2" noWrap>{client.address}</Typography>
              </Stack>
            )}
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Billed</Typography>
                <Typography fontWeight={600}>${client.totalBilled.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Owed</Typography>
                <Typography
                  fontWeight={600}
                  color={client.outstanding > 0 ? 'error.main' : 'success.main'}
                >
                  ${client.outstanding.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );
};

// --- Main Clients Page ---
export const ClientsPage = () => {
  const [allData, setAllData] = useState({ clients: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortMethod, setSortMethod] = useState('name');

  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const { setLoading: setStoreLoading, loading: storeLoading } = useUserStore();
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsData, invoicesData] = await Promise.all([
        getData('clients'),
        getData('invoices')
      ]);
      setAllData({ clients: clientsData, invoices: invoicesData });
    } catch {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (client = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveClient = async (formData) => {
    setStoreLoading(true);
    try {
      if (editingClient) {
        await putData(`clients/${editingClient.client_id}`, formData);
      } else {
        await postData('clients', formData);
      }
      handleCloseModal();
      fetchData();
    } catch {
      setError('Could not save client.');
    } finally {
      setStoreLoading(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Delete this client? This won’t remove their invoices.')) return;
    setStoreLoading(true);
    try {
      await deleteData(`clients/${id}`);
      fetchData();
    } catch {
      setError('Could not delete client.');
    } finally {
      setStoreLoading(false);
    }
  };

  const handleNewInvoice = (client) => {
    navigate('/invoices/new', { state: { preselectedClient: client } });
  };

  const { clientsWithStats, topClient, clientsWithDebt } = useMemo(() => {
    const { clients, invoices } = allData;
    const enriched = clients.map(c => {
      const invs = invoices.filter(i => i.client_id === c.client_id);
      const totalBilled = invs.reduce((s, i) => s + parseFloat(i.total_amount), 0);
      const outstanding = invs
        .filter(i => ['sent','overdue'].includes(i.status))
        .reduce((s, i) => s + parseFloat(i.total_amount), 0);
      return { ...c, totalBilled, outstanding };
    });
    const filtered = enriched.filter(c =>
      c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
    const sorted = filtered.sort((a, b) => {
      if (sortMethod === 'billed') return b.totalBilled - a.totalBilled;
      if (sortMethod === 'outstanding') return b.outstanding - a.outstanding;
      return a.name.localeCompare(b.name);
    });
    const top = enriched.sort((a,b) => b.totalBilled - a.totalBilled)[0] || null;
    const debtCount = enriched.filter(c => c.outstanding > 0).length;
    return { clientsWithStats: sorted, topClient: top, clientsWithDebt: debtCount };
  }, [allData, debouncedSearchTerm, sortMethod]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
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
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h4" fontWeight={700}>Clients</Typography>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<Plus />}
            onClick={() => handleOpenModal()}
          >
            New Client
          </Button>
        </Box>

        {/* Stats */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Total Clients"
              value={allData.clients.length}
              icon={<Users />}
              color={theme.palette.primary.main}
              delay={1}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Clients with Debt"
              value={clientsWithDebt}
              icon={<AlertTriangle />}
              color={theme.palette.error.main}
              delay={2}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card
                elevation={3}
                sx={{
                  height: '100%',
                  borderRadius: theme.shape.borderRadiusLG,
                  bgcolor: alpha(theme.palette.secondary.main, 0.1)
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle2" color="text.secondary">Top Client</Typography>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.15), width: 44, height: 44 }}>
                      <Award style={{ color: theme.palette.secondary.main, width: 24, height: 24 }} />
                    </Avatar>
                  </Stack>
                  <Typography variant="h5" fontWeight={700} noWrap>
                    {topClient?.name || 'N/A'}
                  </Typography>
                  <Typography color="text.secondary">
                    Billed: ${topClient?.totalBilled.toFixed(2) || '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper
          elevation={1}
          sx={{
            p: 2,
            mb: 4,
            borderRadius: theme.shape.borderRadiusLG,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <TextField
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} color={theme.palette.text.secondary} />
                </InputAdornment>
              )
            }}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              label="Sort By"
              value={sortMethod}
              onChange={(e) => setSortMethod(e.target.value)}
            >
              <MenuItem value="name">Name (A–Z)</MenuItem>
              <MenuItem value="billed">Billed (High–Low)</MenuItem>
              <MenuItem value="outstanding">Owed (High–Low)</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* Client Cards */}
        <Grid container spacing={3}>
          <AnimatePresence>
            {clientsWithStats.length > 0 ? (
              clientsWithStats.map(client => (
                <ClientCard
                  key={client.client_id}
                  client={client}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteClient}
                  onNewInvoice={handleNewInvoice}
                />
              ))
            ) : (
              <Grid item xs={12}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <Box sx={{ textAlign: 'center', py: 8, bgcolor: 'action.hover', borderRadius: theme.shape.borderRadiusLG }}>
                    <Users size={48} color={theme.palette.text.secondary} opacity={0.3} />
                    <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                      {allData.clients.length === 0 ? 'No clients yet' : 'No clients match filters'}
                    </Typography>
                    {allData.clients.length === 0 && (
                      <Button variant="contained" sx={{ mt: 3 }} onClick={() => handleOpenModal()}>
                        Add First Client
                      </Button>
                    )}
                  </Box>
                </motion.div>
              </Grid>
            )}
          </AnimatePresence>
        </Grid>
      </motion.div>

      {/* Client modal */}
      <ClientFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveClient}
        client={editingClient}
        loading={storeLoading}
      />
    </Container>
  );
};
