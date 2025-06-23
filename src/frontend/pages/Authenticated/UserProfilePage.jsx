// File: src/frontend/pages/Authenticated/UserProfilePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box, Typography, TextField, Button, Alert, Paper,
  useTheme, CircularProgress, Avatar, Snackbar, Container,
  Divider, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Grid, InputAdornment, IconButton, Card,
  CardContent, CardHeader, Badge, Tooltip
} from "@mui/material";
import {
  Edit, Save, Lock, Trash2, Eye, EyeOff,
  CheckCircle, ExternalLink, Camera, CreditCard, AlertTriangle
} from 'lucide-react';
import { Business } from "@mui/icons-material"; 
import { useUserStore } from "../../store/userStore";
import {
  postData, putData, deleteData,
  uploadFile, getData
} from "../../utils/BackendRequestHelper";
import {
  updateUserPassword, reauthenticateUser,
  deleteFirebaseUser, auth
} from "../../../firebase";
import { motion } from 'framer-motion';

// ——— Reusable Dialogs (unchanged) ———
const ConfirmationDialog = ({ open, onClose, onConfirm, title, message, loading }) => (
  <Dialog open={open} onClose={onClose}>
    <DialogTitle fontWeight="bold">{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Cancel</Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
        {loading ? <CircularProgress size={24} /> : "Delete"}
      </Button>
    </DialogActions>
  </Dialog>
);
const ReauthDialog = ({ open, onClose, onConfirm, title, loading }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight="bold">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          For your security, please enter your password to continue.
        </DialogContentText>
        <TextField
          autoFocus
          type={showPassword ? 'text' : 'password'}
          label="Current Password"
          fullWidth
          value={password}
          onChange={e => setPassword(e.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onConfirm(password)} variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Confirm"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
const ChangePasswordDialog = ({ open, onClose, onSave, loading, apiError, setApiError }) => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false });
  const [error, setError] = useState('');

  const handleSave = () => {
    setError(''); setApiError('');
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setError("All fields are required.");
      return;
    }
    if (passwords.new.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setError("New passwords do not match.");
      return;
    }
    onSave(passwords.current, passwords.new);
  };

  const toggle = field => setShowPasswords(p => ({ ...p, [field]: !p[field] }));
  
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight="bold">Change Password</DialogTitle>
      <DialogContent>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
        {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
        <TextField
          autoFocus margin="dense"
          label="Current Password"
          type={showPasswords.current ? 'text' : 'password'}
          fullWidth
          value={passwords.current}
          onChange={e => setPasswords({...passwords, current: e.target.value})}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => toggle('current')}>
                  {showPasswords.current ? <EyeOff size={20}/> : <Eye size={20}/>}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <TextField
          margin="dense" label="New Password"
          type={showPasswords.new ? 'text' : 'password'}
          fullWidth
          value={passwords.new}
          onChange={e => setPasswords({...passwords, new: e.target.value})}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => toggle('new')}>
                  {showPasswords.new ? <EyeOff size={20}/> : <Eye size={20}/>}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <TextField
          margin="dense"
          label="Confirm New Password"
          type="password"
          fullWidth
          value={passwords.confirm}
          onChange={e => setPasswords({...passwords, confirm: e.target.value})}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Save Password"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ——— Main Page ———
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

  const [stripeStatus, setStripeStatus] = useState({ loading: true, isConnected: false, detailsSubmitted: false, accountId: null });
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFormData({ first_name: profile.first_name, last_name: profile.last_name });
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile]);

  const showNotification = (msg, sev="success") => setNotification({ open: true, message: msg, severity: sev });

  // fetch Stripe status & handle return
  useEffect(() => {
    (async () => {
      setStripeStatus(s => ({ ...s, loading: true }));
      try {
        const status = await getData('/stripe-connect/account-status');
        setStripeStatus({ ...status, loading: false });
      } catch {
        showNotification("Could not fetch payment status.", "error");
        setStripeStatus({ loading: false, isConnected:false, detailsSubmitted:false, accountId:null });
      }
    })();
    if (new URLSearchParams(location.search).get('stripe_return') === 'true') {
      showNotification("Stripe settings updated.", "info");
      navigate('/user-profile', { replace: true });
    }
  }, [location.search, navigate]);

  // pick a new logo
  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (file?.type?.startsWith("image/")) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // single “Save” -> upload avatar (if any) + update profile
  const handleSaveAll = async () => {
    setLoading(true);
    setAvatarLoading(true);
    try {
      let updatedProfile = profile;

      // 1) upload new avatar
      if (avatarFile) {
        const form = new FormData();
        form.append("avatar", avatarFile);
        const res = await uploadFile("/profile/avatar", form);
        updatedProfile = res.profile;
      }

      // 2) update names
      const res2 = await putData("profile", formData);
      updatedProfile = res2.profile;

      setProfile(updatedProfile);
      showNotification("Profile and logo saved!");
      setIsEditing(false);
      setAvatarFile(null);
    } catch (err) {
      showNotification(err.message || "Failed to save profile.", "error");
    } finally {
      setLoading(false);
      setAvatarLoading(false);
    }
  };

  const handleChangePassword = async (current, next) => {
    setLoading(true); setApiError("");
    try {
      await reauthenticateUser(current);
      await updateUserPassword(next);
      showNotification("Password updated!");
      setDialogOpen(d => ({...d, changePass: false}));
    } catch {
      setApiError("Check your current password and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async pwd => {
    setLoading(true);
    try {
      await reauthenticateUser(pwd);
      await deleteData("users/me");
      await deleteFirebaseUser();
      clearUser();
    } catch {
      showNotification("Failed to delete account.", "error");
    } finally {
      setLoading(false);
      setDialogOpen(d => ({...d, reauthDelete: false}));
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: 'background.default', py: { xs:3, sm:5 } }}>
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(n => ({...n, open:false}))}
        anchorOrigin={{ vertical:"top", horizontal:"center" }}
      >
        <Alert severity={notification.severity} onClose={() => setNotification(n => ({...n, open:false}))}>
          {notification.message}
        </Alert>
      </Snackbar>

      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={700} gutterBottom>Settings</Typography>
        <Grid container spacing={4} sx={{ mt:1 }}>
          {/* PROFILE CARD */}
          <Grid item xs={12} md={8}>
            <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}>
              <Card elevation={4} sx={{ p:{xs:2,sm:3}, borderRadius: theme.shape.borderRadiusLG }}>
                <CardHeader
                  title="Profile Details"
                  action={
                    !isEditing && (
                      <Button variant="outlined" startIcon={<Edit size={16}/>} onClick={() => setIsEditing(true)}>
                        Edit
                      </Button>
                    )
                  }
                />
                <CardContent>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item>
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                      />
                      <Tooltip title="Change Company Logo" placement="right">
                        <IconButton onClick={() => fileInputRef.current.click()} sx={{ p:0 }}>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical:'bottom', horizontal:'right' }}
                            badgeContent={
                              <Avatar sx={{ bgcolor:'background.paper', width:32, height:32 }}>
                                <Camera size={18}/>
                              </Avatar>
                            }
                          >
                            <Avatar src={avatarPreview} sx={{ width:100, height:100 }}>
                              <Business sx={{ fontSize:'3rem' }}/>
                            </Avatar>
                          </Badge>
                        </IconButton>
                      </Tooltip>
                    </Grid>
                    <Grid item xs>
                      {isEditing ? (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="First Name"
                              fullWidth
                              value={formData.first_name}
                              onChange={e => setFormData({...formData, first_name: e.target.value})}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="Last Name"
                              fullWidth
                              value={formData.last_name}
                              onChange={e => setFormData({...formData, last_name: e.target.value})}
                            />
                          </Grid>
                        </Grid>
                      ) : (
                        <Box>
                          <Typography variant="h5" fontWeight={600}>
                            {profile?.first_name} {profile?.last_name}
                          </Typography>
                          <Typography color="text.secondary">{auth.currentUser?.email}</Typography>
                        </Box>
                      )}
                    </Grid>
                  </Grid>

                  {isEditing && (
                    <Box
                      sx={{
                        display:'flex',
                        justifyContent:'flex-end',
                        gap:2,
                        mt:3,
                        pt:3,
                        borderTop:1,
                        borderColor:'divider'
                      }}
                    >
                      <Button
                        variant="text"
                        onClick={() => {
                          setIsEditing(false);
                          setAvatarFile(null);
                          setFormData({
                            first_name: profile.first_name,
                            last_name: profile.last_name
                          });
                        }}
                        disabled={loading || avatarLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={
                          (loading || avatarLoading)
                            ? <CircularProgress size={20}/>
                            : <Save size={16}/>
                        }
                        onClick={handleSaveAll}
                        disabled={loading || avatarLoading}
                      >
                        Save
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* SECURITY & DELETE CARD */}
              <Card elevation={4} sx={{ p:{xs:2,sm:3}, mt:4, borderRadius: theme.shape.borderRadiusLG }}>
                <CardHeader title="Security"/>
                <CardContent>
                  <Box
                    sx={{
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center',
                      py:2,
                      flexWrap:'wrap',
                      gap:2
                    }}
                  >
                    <Box>
                      <Typography fontWeight={500}>Change Password</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Update your password to keep your account secure.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<Lock size={16}/>}
                      onClick={() => setDialogOpen(d => ({...d, changePass:true}))}
                    >
                      Change
                    </Button>
                  </Box>
                  <Divider/>
                  <Box
                    sx={{
                      display:'flex',
                      justifyContent:'space-between',
                      alignItems:'center',
                      py:2,
                      flexWrap:'wrap',
                      gap:2
                    }}
                  >
                    <Box>
                      <Typography fontWeight={500} color="error">Delete Account</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Permanently delete your account and all data.
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Trash2 size={16}/>}
                      onClick={() => setDialogOpen(d => ({...d, deleteConfirm:true}))}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* PAYMENT SETTINGS CARD */}
          <Grid item xs={12} md={4}>
            <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}>
              <Card elevation={4} sx={{ borderRadius: theme.shape.borderRadiusLG, height: '100%' }}>
                <CardHeader title="Payment Settings" subheader="Powered by Stripe Connect"/>
                <CardContent sx={{ textAlign:'center', p:3 }}>
                  {stripeStatus.loading ? (
                    <CircularProgress />
                  ) : stripeStatus.isConnected && stripeStatus.detailsSubmitted ? (
                    <>
                      <Avatar sx={{ bgcolor:'success.light', width:60, height:60, mb:2, mx:'auto' }}>
                        <CheckCircle color="success"/>
                      </Avatar>
                      <Typography fontWeight={600} variant="h6">You're ready to get paid!</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
                        Your Stripe account is connected and payouts are enabled.
                      </Typography>
                      <Button
                        component="a"
                        href={`https://dashboard.stripe.com/b/${stripeStatus.accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="text"
                        endIcon={<ExternalLink size={14}/>}
                      >
                        Manage on Stripe
                      </Button>
                    </>
                  ) : stripeStatus.isConnected ? (
                    <>
                      <Avatar sx={{ bgcolor:'warning.light', width:60, height:60, mb:2, mx:'auto' }}>
                        <AlertTriangle color="warning"/>
                      </Avatar>
                      <Typography fontWeight={600} variant="h6">Almost there!</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
                        Finish setting up your Stripe account to start receiving payments.
                      </Typography>
                      <Button variant="contained" color="primary" onClick={() => {
                        setOnboardingLoading(true);
                        postData('stripe-connect/create-account-link').then(res => {
                          if (res.url) window.location.href = res.url;
                        }).catch(() => {
                          showNotification("Failed to connect Stripe", "error");
                        }).finally(() => setOnboardingLoading(false));
                      }} disabled={onboardingLoading}>
                        {onboardingLoading ? <CircularProgress size={20}/> : 'Complete Setup'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Avatar sx={{ bgcolor:'action.hover', width:60, height:60, mb:2, mx:'auto' }}>
                        <CreditCard/>
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ mb:2 }}>
                        Connect your Stripe account to securely receive payments.
                      </Typography>
                      <Button variant="contained" color="primary" fullWidth onClick={() => {
                        setOnboardingLoading(true);
                        postData('stripe-connect/create-account-link').then(res => {
                          if (res.url) window.location.href = res.url;
                        }).catch(() => {
                          showNotification("Failed to connect Stripe", "error");
                        }).finally(() => setOnboardingLoading(false));
                      }} disabled={onboardingLoading}>
                        {onboardingLoading ? <CircularProgress size={24} color="inherit"/> : 'Connect with Stripe'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Dialogs */}
      <ChangePasswordDialog
        open={dialogOpen.changePass}
        onClose={() => setDialogOpen(d => ({...d, changePass:false}))}
        onSave={handleChangePassword}
        loading={loading}
        apiError={apiError}
        setApiError={setApiError}
      />
      <ConfirmationDialog
        open={dialogOpen.deleteConfirm}
        onClose={() => setDialogOpen(d => ({...d, deleteConfirm:false}))}
        onConfirm={() => setDialogOpen(d => ({ deleteConfirm:false, reauthDelete:true}))}
        title="Delete Account?"
        message="This is permanent. Are you sure?"
        loading={loading}
      />
      <ReauthDialog
        open={dialogOpen.reauthDelete}
        onClose={() => setDialogOpen(d => ({...d, reauthDelete:false}))}
        onConfirm={handleDeleteAccount}
        title="Confirm Account Deletion"
        loading={loading}
      />
    </Box>
  );
}
