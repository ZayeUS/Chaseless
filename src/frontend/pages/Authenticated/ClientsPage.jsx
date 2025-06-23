// File: src/frontend/pages/Authenticated/ClientsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Container, CircularProgress, Alert,
  Grid, Card, CardContent, useTheme, Avatar, TextField, InputAdornment,
  IconButton, Menu, MenuItem, alpha, Paper, Select, FormControl, InputLabel,Divider
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, MoreVertical, Edit, Trash2, Mail, MapPin, DollarSign, FilePlus, Award, BarChartHorizontal, AlertTriangle } from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { getData, postData, putData, deleteData } from '../../utils/BackendRequestHelper';
import { ClientFormModal } from '../../components/ClientFormModal';
import { useDebounce } from '../../utils/useDebounce';

// --- Sub-Components for the Enhanced Page ---

// THE FIX: The StatCard component is now defined within this file.
const StatCard = ({ title, value, icon, color = "primary.main", isCurrency = true }) => {
    const theme = useTheme();
    return (
        <Card elevation={2} sx={{ height: '100%', borderRadius: theme.shape.borderRadiusLG, overflow: 'hidden' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight={500} color="text.secondary">{title}</Typography>
                    <Avatar sx={{ bgcolor: alpha(color, 0.1), width: 40, height: 40 }}>{React.cloneElement(icon, { style: { color, width: 20, height: 20 } })}</Avatar>
                </Box>
                <Typography variant="h4" fontWeight={700} sx={{ color, mt: 2 }}>{isCurrency ? '$' : ''}{value}</Typography>
            </CardContent>
        </Card>
    );
};

const ClientCard = ({ client, onEdit, onDelete, onNewInvoice }) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
    const handleMenuClose = (e) => { e.stopPropagation(); setAnchorEl(null); };
    const handleEdit = (e) => { e.stopPropagation(); onEdit(client); handleMenuClose(); };
    const handleDelete = (e) => { e.stopPropagation(); onDelete(client.client_id); handleMenuClose(); };
    const handleNewInvoice = (e) => { e.stopPropagation(); onNewInvoice(client); handleMenuClose(); };
    
    const avatarColor = useMemo(() => {
        let hash = 0; client.name.split('').forEach(char => { hash = char.charCodeAt(0) + ((hash << 5) - hash) });
        let color = '#'; for (let i = 0; i < 3; i++) color += ('00' + ((hash >> (i * 8)) & 0xFF).toString(16)).substr(-2);
        return color;
    }, [client.name]);

    return (
        <Grid item xs={12} sm={6} lg={4}>
            <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} style={{ height: '100%' }}>
                <Card sx={{ height: '100%', borderRadius: theme.shape.borderRadiusLG, display: 'flex', flexDirection: 'column', '&:hover': { boxShadow: theme.shadows[8], transform: 'translateY(-4px)' }, transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out' }}>
                    <CardContent sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Avatar sx={{ bgcolor: alpha(avatarColor, 0.7), color: theme.palette.getContrastText(avatarColor), width: 56, height: 56, fontSize: '1.5rem' }}>{client.name.charAt(0).toUpperCase()}</Avatar>
                            <IconButton size="small" onClick={handleMenuClick}><MoreVertical size={20} /></IconButton>
                            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                                <MenuItem onClick={handleNewInvoice}><FilePlus size={16} style={{ marginRight: 8 }} /> New Invoice for Client</MenuItem>
                                <MenuItem onClick={handleEdit}><Edit size={16} style={{ marginRight: 8 }} /> Edit Client</MenuItem>
                                <Divider />
                                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}><Trash2 size={16} style={{ marginRight: 8 }} /> Delete Client</MenuItem>
                            </Menu>
                        </Box>
                        <Typography variant="h6" fontWeight={600} noWrap>{client.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', mt: 1 }}><Mail size={16} /><Typography variant="body2" sx={{ ml: 1 }} noWrap>{client.email}</Typography></Box>
                        <Divider sx={{ my: 2 }} />
                        <Grid container spacing={2} sx={{ mt: 'auto' }}>
                            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Total Billed</Typography><Typography fontWeight={600}>${client.totalBilled.toFixed(2)}</Typography></Grid>
                            <Grid item xs={6}><Typography variant="body2" color="text.secondary">Owed</Typography><Typography fontWeight={600} color={client.outstanding > 0 ? 'error.main' : 'success.main'}>${client.outstanding.toFixed(2)}</Typography></Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </motion.div>
        </Grid>
    );
};

// --- Main Clients Page Component ---
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
      const [clientsData, invoicesData] = await Promise.all([getData('clients'), getData('invoices')]);
      setAllData({ clients: clientsData, invoices: invoicesData });
    } catch (err) { setError('Failed to fetch client data.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOpenModal = (client = null) => { setEditingClient(client); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingClient(null); };
  const handleNewInvoiceForClient = (client) => navigate('/invoices/new', { state: { preselectedClient: client } });

  const handleSaveClient = async (formData) => {
    setStoreLoading(true);
    try {
      if (editingClient) await putData(`clients/${editingClient.client_id}`, formData);
      else await postData('clients', formData);
      handleCloseModal();
      fetchData();
    } catch (err) { setError('Failed to save client.'); } finally { setStoreLoading(false); }
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
        setStoreLoading(true);
        try { await deleteData(`clients/${clientId}`); fetchData(); } 
        catch (err) { setError('Failed to delete client.'); } 
        finally { setStoreLoading(false); }
    }
  };
  
  const { clientsWithStats, topClient, clientsWithDebt } = useMemo(() => {
    const clientsWithData = allData.clients.map(client => {
        const clientInvoices = allData.invoices.filter(inv => inv.client_id === client.client_id);
        const totalBilled = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
        const outstanding = clientInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((sum, inv) => sum + parseFloat(inv.total_amount), 0);
        return { ...client, totalBilled, outstanding };
    });

    const topClient = [...clientsWithData].sort((a,b) => b.totalBilled - a.totalBilled)[0] || null;
    const clientsWithDebt = clientsWithData.filter(c => c.outstanding > 0).length;

    return { 
        clientsWithStats: clientsWithData
          .filter(c => c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || c.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
          .sort((a, b) => {
              if(sortMethod === 'outstanding') return b.outstanding - a.outstanding;
              if(sortMethod === 'billed') return b.totalBilled - a.totalBilled;
              return a.name.localeCompare(b.name);
          }),
        topClient,
        clientsWithDebt,
    };
  }, [allData, debouncedSearchTerm, sortMethod]);

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 }}};
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 }};

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" fontWeight={700}>Clients</Typography>
                <Button variant="contained" color="secondary" size="large" startIcon={<Plus />} onClick={() => handleOpenModal()}>New Client</Button>
            </Box>
        </motion.div>

        <Grid container spacing={3} sx={{mb: 4}}>
            <Grid item xs={12} sm={4}><motion.div variants={itemVariants}><StatCard title="Total Clients" value={allData.clients.length} icon={<Users/>} color={theme.palette.primary.main} isCurrency={false}/></motion.div></Grid>
            <Grid item xs={12} sm={4}><motion.div variants={itemVariants}><StatCard title="Clients with Debt" value={clientsWithDebt} icon={<AlertTriangle/>} color={theme.palette.error.main} isCurrency={false}/></motion.div></Grid>
            <Grid item xs={12} sm={4}><motion.div variants={itemVariants}>
                <Card sx={{height: '100%', borderRadius: theme.shape.borderRadiusLG, bgcolor: alpha(theme.palette.secondary.main, 0.1)}}>
                    <CardContent sx={{p:3}}>
                        <Box sx={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                            <Typography variant="body1" fontWeight={500} color="text.secondary">Top Client</Typography>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), width: 40, height: 40 }}><Award style={{color: theme.palette.secondary.main}}/></Avatar>
                        </Box>
                        <Typography variant="h5" fontWeight={700} sx={{color: 'secondary.dark', mt: 2}}>{topClient?.name || 'N/A'}</Typography>
                    </CardContent>
                </Card>
            </motion.div></Grid>
        </Grid>

        <motion.div variants={itemVariants}>
            <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: theme.shape.borderRadiusLG, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', bgcolor: 'background.paper' }}>
                <TextField fullWidth sx={{flex: 1, minWidth: '250px'}} placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{startAdornment: (<InputAdornment position="start"><Search size={20} color={theme.palette.text.secondary} /></InputAdornment>)}}/>
                <FormControl sx={{minWidth: 200}}>
                    <InputLabel id="sort-by-label">Sort By</InputLabel>
                    <Select labelId="sort-by-label" label="Sort By" value={sortMethod} onChange={(e) => setSortMethod(e.target.value)}>
                        <MenuItem value="name">Name (A-Z)</MenuItem>
                        <MenuItem value="billed">Total Billed</MenuItem>
                        <MenuItem value="outstanding">Outstanding Balance</MenuItem>
                    </Select>
                </FormControl>
            </Paper>
        </motion.div>
      </motion.div>
      
      {loading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>) : (
        <Grid container spacing={3}>
            <AnimatePresence>
                {clientsWithStats.length > 0 ? (
                    clientsWithStats.map((client) => (<ClientCard key={client.client_id} client={client} onEdit={handleOpenModal} onDelete={handleDeleteClient} onNewInvoice={handleNewInvoiceForClient}/>))
                ) : (
                    <Grid item xs={12}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Users size={48} opacity={0.5}/>
                                <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>{allData.clients.length > 0 ? "No Clients Found" : "Your Client List is Empty"}</Typography>
                                <Typography color="text.secondary">{allData.clients.length > 0 ? "No clients match your current search." : "Add your first client to start sending invoices."}</Typography>
                            </Box>
                        </motion.div>
                    </Grid>
                )}
            </AnimatePresence>
        </Grid>
      )}
      
      <ClientFormModal open={isModalOpen} onClose={handleCloseModal} onSave={handleSaveClient} client={editingClient} loading={storeLoading}/>
    </Container>
  );
};