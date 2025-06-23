import React, { useEffect, useMemo, useCallback } from "react";
import { CssBaseline, Box, useMediaQuery, ThemeProvider } from "@mui/material";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useUserStore } from "./frontend/store/userStore";
import { createAppTheme } from "./frontend/styles/theme";
import { Sidebar } from "./frontend/components/navigation/Sidebar";
import { MobileBottomNavigation } from "./frontend/components/navigation/MobileBottomNavigation";
import { FullScreenLoader } from "./frontend/components/FullScreenLoader";
import { motion, AnimatePresence } from 'framer-motion';

// Pages
import { LoginPage } from "./frontend/pages/Non-Authenticated/LoginPage";
import { SignUpPage } from "./frontend/pages/Non-Authenticated/SignUpPage";
import { AdminDashboard } from "./frontend/pages/Authenticated/AdminDashboard";
import { UserDashboard } from "./frontend/pages/Authenticated/UserDashboard";
import { OnboardingWizard } from "./frontend/pages/Authenticated/OnboardingWizard";
import { UserProfilePage } from "./frontend/pages/Authenticated/UserProfilePage";
import { PaymentSuccessPage } from "./frontend/pages/Authenticated/PaymentSuccessPage";
import { ProtectedRoute } from "./frontend/components/ProtectedRoute";
import { ClientsPage } from "./frontend/pages/Authenticated/ClientsPage";
import { PublicInvoicePage } from "./frontend/pages/Public/PublicInvoicePage";
import { InvoicesPage } from "./frontend/pages/Authenticated/InvoicesPage";
import { InvoiceFormPage } from "./frontend/pages/Authenticated/InvoiceFormPage";

const DRAWER_WIDTH = 60;

export const App = () => {
  const {
    isLoggedIn, profile, roleId, listenAuthState, authHydrated,
    isDarkMode, toggleTheme
  } = useUserStore();
  
  const theme = useMemo(() => createAppTheme(isDarkMode ? "dark" : "light"), [isDarkMode]);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = listenAuthState();
    return () => unsubscribe();
  }, [listenAuthState]);
  
  const getRedirect = useCallback(() => {
    if (!isLoggedIn) return "/login";
    
    if (!profile || !profile.fully_onboarded) {
      return "/profile-onboarding";
    }
    
    // Admins go to their own dashboard, regular users go to the main one.
    return roleId === 1 ? "/admin-dashboard" : "/dashboard";
  }, [isLoggedIn, profile, roleId]);

  const showNavUI = isLoggedIn && location.pathname !== "/profile-onboarding" && !location.pathname.startsWith('/invoice/');
  const isLoading = !authHydrated;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FullScreenLoader isLoading={isLoading} />
      <AnimatePresence>
        {!isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexGrow: 1, minHeight: '100vh' }}>
            <Box sx={{ display: "flex", flexGrow: 1 }}>
              {showNavUI && !isMobile && <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} isMobile={isMobile} />}
              <Box component="main" sx={{ flexGrow: 1, bgcolor: "background.default", ml: showNavUI && !isMobile ? `${DRAWER_WIDTH}px` : 0, pb: showNavUI && isMobile ? 10 : 0 }}>
                <Routes>
                  {/* Public Routes */}
                  <Route path="/invoice/:invoiceId" element={<PublicInvoicePage />} />
                  <Route path="/login" element={isLoggedIn ? <Navigate to={getRedirect()} /> : <LoginPage />} />
                  <Route path="/signup" element={isLoggedIn ? <Navigate to={getRedirect()} /> : <SignUpPage />} />

                  {/* Authenticated Routes */}
                  <Route path="/" element={<Navigate to={getRedirect()} />} />
                  <Route
                    path="/profile-onboarding"
                    element={
                      <ProtectedRoute>
                        {profile && profile.fully_onboarded ? (
                          <Navigate to="/dashboard" replace />
                        ) : (
                          <OnboardingWizard initialStep={profile ? 2 : 1} />
                        )}
                      </ProtectedRoute>
                    }
                  />
                  
                  {/* CORRECTED: /dashboard now correctly points to UserDashboard */}
                  <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[2]}><UserDashboard /></ProtectedRoute>} />

                  <Route path="/user-profile" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                  <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={[1]}><AdminDashboard /></ProtectedRoute>} />
                  <Route path="/clients" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
                  <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
                  <Route path="/invoices/new" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
                  <Route path="/invoices/edit/:invoiceId" element={<ProtectedRoute><InvoiceFormPage /></ProtectedRoute>} />
                  <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
                  
                  <Route path="*" element={<Navigate to={getRedirect()} />} />
                </Routes>
              </Box>
              {showNavUI && isMobile && <MobileBottomNavigation isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeProvider>
  );
};