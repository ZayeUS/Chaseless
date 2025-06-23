// File: src/frontend/pages/Authenticated/UserProfilePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, Button, Alert, Paper,
  useTheme, CircularProgress, Avatar, Snackbar, Container,
  Divider, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Grid,
  InputAdornment, IconButton, Card, CardContent, CardHeader, Badge
} from "@mui/material";
import {
    Edit, Save, User, Lock, Trash2, Eye, EyeOff, CheckCircle, ExternalLink, Camera
} from 'lucide-react';
import { useUserStore } from "../../store/userStore";
import { postData, putData, deleteData, getData, uploadFile } from "../../utils/BackendRequestHelper";
import { updateUserPassword, reauthenticateUser, deleteFirebaseUser,auth } from "../../../firebase";
import { motion } from 'framer-motion';

// --- Reusable Dialog Components (No Changes) ---
const ConfirmationDialog = ({ open, onClose, onConfirm, title, message, loading }) => ( <Dialog open={open} onClose={onClose}><DialogTitle fontWeight="bold">{title}</DialogTitle><DialogContent><DialogContentText>{message}</DialogContentText></DialogContent><DialogActions><Button onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : "Delete"}</Button></DialogActions></Dialog> );
const ReauthDialog = ({ open, onClose, onConfirm, title, loading }) => { const [password, setPassword] = useState(''); const [showPassword, setShowPassword] = useState(false); return (<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle fontWeight="bold">{title}</DialogTitle><DialogContent><DialogContentText sx={{ mb: 2 }}>For your security, please enter your password to continue.</DialogContentText><TextField autoFocus type={showPassword ? 'text' : 'password'} label="Current Password" fullWidth value={password} onChange={(e) => setPassword(e.target.value)} InputProps={{endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</IconButton></InputAdornment>),}}/></DialogContent><DialogActions><Button onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={() => onConfirm(password)} variant="contained" color="primary" disabled={loading}>{loading ? <CircularProgress size={24} /> : "Confirm"}</Button></DialogActions></Dialog>); };
const ChangePasswordDialog = ({ open, onClose, onSave, loading, apiError, setApiError }) => { const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' }); const [showPasswords, setShowPasswords] = useState({ current: false, new: false }); const [error, setError] = useState(''); const handleSave = () => { setError(''); setApiError(''); if (!passwords.current || !passwords.new || !passwords.confirm) { setError("All fields are required."); return; } if (passwords.new.length < 6) { setError("New password must be at least 6 characters."); return; } if (passwords.new !== passwords.confirm) { setError("New passwords do not match."); return; } onSave(passwords.current, passwords.new); }; const toggleShowPassword = (field) => { setShowPasswords(prev => ({...prev, [field]: !prev[field]})); }; return (<Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle fontWeight="bold">Change Password</DialogTitle><DialogContent>{error && <Alert severity="warning" sx={{mb: 2}}>{error}</Alert>}{apiError && <Alert severity="error" sx={{mb: 2}}>{apiError}</Alert>}<TextField autoFocus margin="dense" label="Current Password" type={showPasswords.current ? 'text' : 'password'} fullWidth value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})} InputProps={{endAdornment: (<InputAdornment position="end"><IconButton onClick={() => toggleShowPassword('current')}>{showPasswords.current ? <EyeOff size={20}/> : <Eye size={20}/>}</IconButton></InputAdornment>)}}/><TextField margin="dense" label="New Password" type={showPasswords.new ? 'text' : 'password'} fullWidth value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} InputProps={{endAdornment: (<InputAdornment position="end"><IconButton onClick={() => toggleShowPassword('new')}>{showPasswords.new ? <EyeOff size={20}/> : <Eye size={20}/>}</IconButton></InputAdornment>)}}/><TextField margin="dense" label="Confirm New Password" type="password" fullWidth value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} /></DialogContent><DialogActions><Button onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={handleSave} variant="contained" disabled={loading}>{loading ? <CircularProgress size={24} /> : "Save Password"}</Button></DialogActions></Dialog>); };


// --- Main User Profile Page ---
export function UserProfilePage() {
  const { profile, setProfile, clearUser, setLoading, loading } = useUserStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '' });
  const [notification, setNotification] = useState({ open: false, message: "", severity: "success" });
  const [dialogOpen, setDialogOpen] = useState({ changePass: false, deleteConfirm: false, reauthDelete: false });
  const [apiError, setApiError] = useState('');
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);
  
  const [stripeStatus, setStripeStatus] = useState({ loading: true, isConnected: false, detailsSubmitted: false });
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      setFormData({ first_name: profile.first_name, last_name: profile.last_name });
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const showNotification = (message, severity = "success") => setNotification({ open: true, message, severity });

  useEffect(() => {
    const fetchStripeStatus = async () => {
        setStripeStatus(prev => ({ ...prev, loading: true }));
        try {
            const status = await getData('stripe-connect/account-status');
            setStripeStatus({ ...status, loading: false });
        } catch (err) {
            showNotification("Could not fetch payment status.", "error");
            setStripeStatus({ loading: false, isConnected: false, detailsSubmitted: false });
        }
    };
    fetchStripeStatus();

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('stripe_return')) {
      showNotification("Welcome back! Your payment settings are being updated.", "info");
      navigate('/user-profile', { replace: true });
    }
  }, [location.search, navigate]);
  
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  
  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
        const uploadFormData = new FormData();
        uploadFormData.append("avatar", avatarFile);
        const response = await uploadFile("profile/avatar", uploadFormData);
        setProfile(response.profile);
        setAvatarFile(null);
        showNotification("Avatar updated successfully!");
    } catch (err) {
        showNotification(err.message || "Failed to upload avatar.", "error");
    } finally {
        setAvatarLoading(false);
    }
  };

  const handleConnectStripe = async () => {
      setOnboardingLoading(true);
      try {
          const { url } = await postData('stripe-connect/create-account-link');
          if (url) window.location.href = url;
          else throw new Error("Could not get Stripe onboarding URL.");
      } catch (err) {
          showNotification("Failed to connect to Stripe. Please try again.", "error");
          setOnboardingLoading(false);
      }
  };

  const handleProfileSave = async () => {
    setLoading(true);
    try {
        const response = await putData('profile', formData);
        setProfile(response.profile);
        showNotification("Profile updated successfully!");
        setIsEditing(false);
    } catch (err) {
        showNotification(err.message || "Failed to update profile.", "error");
    } finally {
        setLoading(false);
    }
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    setLoading(true); setApiError('');
    try {
        await reauthenticateUser(currentPassword);
        await updateUserPassword(newPassword);
        showNotification("Password updated successfully!");
        setDialogOpen(prev => ({...prev, changePass: false}));
    } catch (error) {
        setApiError("An error occurred. Please check your current password and try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteAccount = async (password) => {
    setLoading(true);
    try {
        await reauthenticateUser(password);
        await deleteData('users/me');
        await deleteFirebaseUser();
        clearUser();
    } catch (error) {
        showNotification("Failed to delete account. Please check your password.", "error");
    } finally {
        setLoading(false);
        setDialogOpen(prev => ({...prev, reauthDelete: false}));
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', py: { xs: 3, sm: 5 } }}>
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: "top", horizontal: "center" }}>
        <Alert severity={notification.severity} onClose={() => setNotification(prev => ({...prev, open: false}))}>{notification.message}</Alert>
      </Snackbar>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={700} gutterBottom>Settings</Typography>
        <Grid container spacing={4} sx={{mt: 1}}>
            <Grid item xs={12} md={8}>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Paper elevation={4} sx={{ p: {xs:2, sm:4}, borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h6" fontWeight={600}>Profile Details</Typography>
                            {!isEditing && !avatarFile && <Button variant="outlined" startIcon={<Edit size={16}/>} onClick={() => setIsEditing(true)}>Edit Profile</Button>}
                        </Box>
                        
                        <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} sm="auto">
                                <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleAvatarChange} />
                                <IconButton onClick={() => fileInputRef.current.click()} sx={{p:0}}>
                                    <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={<Avatar sx={{bgcolor: 'background.paper', width: 32, height: 32}}><Camera size={18}/></Avatar>}>
                                        <Avatar src={avatarPreview} sx={{ width: 90, height: 90 }}><User size={40}/></Avatar>
                                    </Badge>
                                </IconButton>
                            </Grid>
                            <Grid item xs={12} sm>
                                {isEditing ? (
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}><TextField label="First Name" fullWidth value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></Grid>
                                        <Grid item xs={12} sm={6}><TextField label="Last Name" fullWidth value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></Grid>
                                    </Grid>
                                ) : (
                                    <Box>
                                        <Typography variant="h5" fontWeight={600}>{profile?.first_name} {profile?.last_name}</Typography>
                                        <Typography color="text.secondary">{auth.currentUser?.email}</Typography>
                                    </Box>
                                )}
                            </Grid>
                        </Grid>

                        {(isEditing || avatarFile) && (
                             <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                                 {isEditing && <Button variant="text" onClick={() => { setIsEditing(false); setFormData({ first_name: profile.first_name, last_name: profile.last_name })}}>Cancel</Button>}
                                 {isEditing && <Button variant="contained" startIcon={loading ? <CircularProgress size={20}/> : <Save size={16}/>} onClick={handleProfileSave} disabled={loading}>Save Profile</Button>}
                                 {avatarFile && !isEditing && <Button variant="text" onClick={() => {setAvatarFile(null); setAvatarPreview(profile?.avatar_url)}}>Cancel</Button>}
                                 {avatarFile && <Button variant="contained" color="secondary" startIcon={avatarLoading ? <CircularProgress size={20}/> : <Save size={16}/>} onClick={handleAvatarUpload} disabled={avatarLoading}>Save Photo</Button>}
                            </Box>
                        )}
                    </Paper>

                    <Paper elevation={4} sx={{ p: {xs:2, sm:4}, mt: 4, borderRadius: 2 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Security</Typography><Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, flexWrap: 'wrap', gap: 2 }}><Box><Typography fontWeight={500}>Change Password</Typography><Typography variant="body2" color="text.secondary">Update your password to keep your account secure.</Typography></Box><Button variant="outlined" startIcon={<Lock size={16}/>} onClick={() => setDialogOpen(prev => ({...prev, changePass: true}))}>Change</Button></Box><Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, flexWrap: 'wrap', gap: 2 }}><Box><Typography fontWeight={500} color="error">Delete Account</Typography><Typography variant="body2" color="text.secondary">Permanently delete your account and all data.</Typography></Box><Button variant="outlined" color="error" startIcon={<Trash2 size={16}/>} onClick={() => setDialogOpen(prev => ({...prev, deleteConfirm: true}))}>Delete</Button></Box>
                    </Paper>
                </motion.div>
            </Grid>
            <Grid item xs={12} md={4}>
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{delay: 0.1}}>
                     <Card elevation={4} sx={{borderRadius: 2}}>
                        <CardHeader title={<Typography variant="h6" fontWeight={600}>Payment Settings</Typography>} subheader="Powered by Stripe Connect" />
                        <CardContent>
                            {stripeStatus.loading ? ( <Box sx={{textAlign: 'center', p:3}}><CircularProgress /></Box> ) : 
                             stripeStatus.isConnected && stripeStatus.detailsSubmitted ? ( <Alert severity="success" icon={<CheckCircle size={20} />}> <Typography fontWeight={600}>You're ready to get paid!</Typography> Your Stripe account is connected and payouts are enabled. <Button size="small" variant="text" endIcon={<ExternalLink size={14}/>} sx={{mt:1}}>Manage on Stripe</Button> </Alert> ) : 
                             stripeStatus.isConnected && !stripeStatus.detailsSubmitted ? ( <Alert severity="warning"> <Typography fontWeight={600}>Almost there!</Typography> You need to finish setting up your Stripe account to receive payments. <Button color="warning" sx={{mt:1}} onClick={handleConnectStripe} disabled={onboardingLoading}> {onboardingLoading ? <CircularProgress size={20} /> : 'Complete Setup'} </Button> </Alert> ) : 
                             ( <> <Typography variant="body2" color="text.secondary" sx={{mb:2}}> Connect your Stripe account to securely receive payments for your invoices directly to your bank account. </Typography> <Button fullWidth variant="contained" color="primary" onClick={handleConnectStripe} disabled={onboardingLoading}> {onboardingLoading ? <CircularProgress size={24} color="inherit" /> : 'Connect with Stripe'} </Button> </> )}
                        </CardContent>
                    </Card>
                </motion.div>
            </Grid>
        </Grid>
      </Container>
      <ChangePasswordDialog open={dialogOpen.changePass} onClose={() => setDialogOpen(prev => ({...prev, changePass: false}))} onSave={handleChangePassword} loading={loading} apiError={apiError} setApiError={setApiError}/>
      <ConfirmationDialog open={dialogOpen.deleteConfirm} onClose={() => setDialogOpen(prev => ({...prev, deleteConfirm: false}))} onConfirm={() => {setDialogOpen({deleteConfirm: false, reauthDelete: true})}} title="Delete Account?" message="This action is permanent and cannot be undone. Are you sure you want to delete your account?" />
      <ReauthDialog open={dialogOpen.reauthDelete} onClose={() => setDialogOpen(prev => ({...prev, reauthDelete: false}))} onConfirm={handleDeleteAccount} title="Confirm Account Deletion" loading={loading} />
    </Box>
  );
}