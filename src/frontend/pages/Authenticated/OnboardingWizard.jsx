// File: src/frontend/pages/Authenticated/OnboardingWizard.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Typography, TextField, Button, Alert, Paper, Container, Avatar, Grid,
  CircularProgress, IconButton, Tooltip, LinearProgress, Chip, Stack, useTheme
} from "@mui/material";
import {
  CloudUpload, Business, Logout, ArrowForward,
  CheckCircle, ArrowBack, LightMode, DarkMode, Celebration
} from "@mui/icons-material"; // Changed AccountCircle to Business
import { FileText, Zap, Shield } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { postData, uploadFile } from "../../utils/BackendRequestHelper";
import { useUserStore } from "../../store/userStore";
import { motion, AnimatePresence } from 'framer-motion';

// Step 1: Profile Information
const ProfileStep = ({ onProfileComplete, loading }) => {
  const [form, setForm] = useState({ first_name: "", last_name: "" });
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const handleChange = (e) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: value })); if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null })); };
  const handleAvatarChange = (e) => { const file = e.target.files[0]; if (file && file.type.startsWith("image/")) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); } };
  const validate = () => { const errs = {}; if (!form.first_name.trim()) errs.first_name = "First name is required."; if (!form.last_name.trim()) errs.last_name = "Last name is required."; setErrors(errs); return Object.keys(errs).length === 0; };
  const handleNext = () => { if (validate()) { onProfileComplete(form, avatarFile); } };
  
  return (
    <Box>
        {/* ** THE FIX: Changed language and icon to "Logo" ** */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar src={avatarPreview} sx={{ width: 100, height: 100, mb: 2, bgcolor: 'action.hover' }}>
                <Business sx={{ fontSize: '5rem' }} />
            </Avatar>
            <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
                {avatarPreview ? "Change Logo" : "Upload Logo (Optional)"}
                <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
            </Button>
        </Box>
        {/* ** END OF FIX ** */}

        <Grid container spacing={2}>
            <Grid item xs={12} sm={6}><TextField name="first_name" label="First Name" fullWidth value={form.first_name} onChange={handleChange} error={!!errors.first_name} helperText={errors.first_name} /></Grid>
            <Grid item xs={12} sm={6}><TextField name="last_name" label="Last Name" fullWidth value={form.last_name} onChange={handleChange} error={!!errors.last_name} helperText={errors.last_name} /></Grid>
        </Grid>
        <Button onClick={handleNext} fullWidth variant="contained" size="large" disabled={loading} endIcon={loading ? <CircularProgress size={20} /> : <ArrowForward />} sx={{ mt: 4, py: 1.5 }}>
            {loading ? "Saving Profile..." : "Next"}
        </Button>
    </Box>
  );
};

// Step 2: Subscription Step for ChaseLess Beta
const SubscriptionStep = ({ onPlanSelected, backStep, loading, setLoading }) => {
  const theme = useTheme();

  const handleBetaAccess = async () => {
    setLoading(true);
    try {
      await postData('/stripe/select-free-tier', {});
      onPlanSelected('free');
    } catch (error) {
      console.error("Failed to select free tier:", error);
      setLoading(false);
    }
  };

  return (
    <Box>
      <Grid container justifyContent="center">
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: {xs: 3, md: 4}, display: 'flex', flexDirection: 'column', height: '100%', borderRadius: theme.shape.borderRadiusLG, border: `1px solid ${theme.palette.divider}` }}>
            <Chip label="Exclusive Beta Access" color="secondary" size="small" sx={{ alignSelf: 'center', mb: 2 }} />
            <Typography variant="h4" fontWeight={700} textAlign="center">Welcome to ChaseLess</Typography>
            <Typography variant="h6" color="text.secondary" textAlign="center" sx={{ my: 2 }}>
              You're invited to get free, early access to the tools that will automate your invoicing and get you paid faster.
            </Typography>
            
            <Stack spacing={2} sx={{ my: 4, flexGrow: 1 }}>
              {[
                { icon: <FileText size={20} color={theme.palette.secondary.main}/>, text: "Create and send unlimited invoices." },
                { icon: <Zap size={20} color={theme.palette.secondary.main}/>, text: "Automate invoice reminders and follow-ups." },
                { icon: <Shield size={20} color={theme.palette.secondary.main}/>, text: "Secure payment processing via Stripe." }
              ].map(item => (
                <Box key={item.text} sx={{display: 'flex', alignItems: 'center'}}>
                  <Box sx={{mr: 1.5, display: 'flex', alignItems: 'center'}}>{item.icon}</Box>
                  <Typography variant="body1">{item.text}</Typography>
                </Box>
              ))}
            </Stack>

            <Button onClick={handleBetaAccess} variant="contained" color="secondary" fullWidth size="large" disabled={loading} endIcon={loading ? <CircularProgress size={24}/> : <ArrowForward />}>
              Get Free Beta Access
            </Button>
          </Paper>
        </Grid>
      </Grid>
      {backStep && <Button onClick={backStep} startIcon={<ArrowBack />} sx={{ mt: 4 }} disabled={loading}>Back to Profile</Button>}
    </Box>
  );
};


// Step 3: Welcome Screen
const WelcomeStep = () => {
    const navigate = useNavigate();
    const { setProfile, setLoading, loading } = useUserStore();
    const handleGoToDashboard = async () => { setLoading(true); try { const response = await postData('/profile/complete-onboarding', {}); setProfile(response.profile); navigate('/dashboard'); } catch (error) { console.error("Failed to finalize onboarding:", error); navigate('/dashboard'); } finally { setLoading(false); } };
    return (
        <Box textAlign="center" p={4}><Celebration color="success" sx={{ fontSize: 80, mb: 2 }} /><Typography variant="h4" fontWeight="bold">You're All Set!</Typography><Typography color="text.secondary" sx={{ my: 2 }}>Your profile is complete and your plan is active. Welcome aboard!</Typography><Button variant="contained" size="large" onClick={handleGoToDashboard} disabled={loading} endIcon={loading ? <CircularProgress size={20}/> : <ArrowForward />}>Go to My Dashboard</Button></Box>
    );
};


export const OnboardingWizard = ({ initialStep = 1 }) => {
  const [step, setStep] = useState(initialStep);
  const [apiError, setApiError] = useState("");
  const { setProfile, clearUser, loading, setLoading, isDarkMode, toggleTheme, userSubscriptionStatus } = useUserStore();
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    const hasActiveSubscription = userSubscriptionStatus === 'active' || userSubscriptionStatus === 'trialing' || userSubscriptionStatus === 'free_active';
    if (step === 2 && hasActiveSubscription) {
      setStep(3);
    }
  }, [step, userSubscriptionStatus]);

  const handleProfileComplete = async (formData, avatarFile) => {
    setLoading(true);
    setApiError("");
    try {
      const profileRes = await postData("/profile", formData);
      let finalProfile = profileRes.profile;
      if (finalProfile && avatarFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("avatar", avatarFile);
        const avatarResponse = await uploadFile("/profile/avatar", uploadFormData);
        finalProfile = avatarResponse.profile;
      }
      
      if (finalProfile) {
        setProfile(finalProfile);
        setStep(2);
      } else {
        throw new Error("Profile creation failed.");
      }
    } catch (err) {
      setApiError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanSelected = (plan) => {
      if (plan === 'free') {
          useUserStore.setState({ userSubscriptionStatus: 'free_active' });
          setStep(3);
      }
  };

  const handleLogout = async () => {
      await clearUser();
      navigate('/login');
  }
  
  const stepTitles = ["1. Tell Us About Yourself", "2. Join the Beta", "3. Welcome to ChaseLess!"];
  const canGoBack = step === 2 && initialStep === 1;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: 4, display: 'flex', alignItems: 'center' }}>
        <Container maxWidth="md">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Paper elevation={12} sx={{ p: { xs: 3, sm: 5 }, borderRadius: theme.shape.borderRadiusLG, position: 'relative' }}>
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex' }}><Tooltip title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}><IconButton onClick={toggleTheme}>{isDarkMode ? <LightMode /> : <DarkMode />}</IconButton></Tooltip><Tooltip title="Logout"><IconButton onClick={handleLogout}><Logout /></IconButton></Tooltip></Box>
                    <Box sx={{ mb: 4, width: '100%' }}><Typography variant="h5" fontWeight="bold" align="center" sx={{ mb: 2 }}>{stepTitles[step - 1]}</Typography><LinearProgress variant="determinate" value={(step / 3) * 100} sx={{height: 8, borderRadius: 4}} /></Box>
                    {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
                    <AnimatePresence mode="wait"><motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }}>
                        {step === 1 && <ProfileStep onProfileComplete={handleProfileComplete} loading={loading} />}
                        {step === 2 && <SubscriptionStep onPlanSelected={handlePlanSelected} backStep={canGoBack ? () => setStep(1) : null} loading={loading} setLoading={setLoading} />}
                        {step === 3 && <WelcomeStep />}
                    </motion.div></AnimatePresence>
                </Paper>
            </motion.div>
        </Container>
    </Box>
  );
};