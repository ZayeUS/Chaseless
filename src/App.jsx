// File: src/App.jsx
import React, { useEffect, useMemo, useCallback } from "react";
import {
  CssBaseline,
  Box,
  useMediaQuery,
  ThemeProvider
} from "@mui/material";
import {
  Routes,
  Route,
  Navigate,
  useLocation
} from "react-router-dom";
import { useUserStore } from "./frontend/store/userStore";
import { createAppTheme } from "./frontend/styles/theme";
import { Sidebar } from "./frontend/components/navigation/Sidebar";
import { MobileBottomNavigation } from "./frontend/components/navigation/MobileBottomNavigation";
import { FullScreenLoader } from "./frontend/components/FullScreenLoader";
import { motion, AnimatePresence } from "framer-motion";

// Pages
import LandingPage from "./frontend/pages/Non-Authenticated/LandingPage";
import { LoginPage } from "./frontend/pages/Non-Authenticated/LoginPage";
import { SignUpPage } from "./frontend/pages/Non-Authenticated/SignUpPage";
import NotFoundPage from "./frontend/pages/Non-Authenticated/NotFoundPage";

import { PublicInvoicePage } from "./frontend/pages/Public/PublicInvoicePage";

import { ProtectedRoute } from "./frontend/components/ProtectedRoute";
import { OnboardingWizard } from "./frontend/pages/Authenticated/OnboardingWizard";
import { UserProfilePage } from "./frontend/pages/Authenticated/UserProfilePage";
import { AdminDashboard } from "./frontend/pages/Authenticated/AdminDashboard";
import { UserDashboard } from "./frontend/pages/Authenticated/UserDashboard";
import { ClientsPage } from "./frontend/pages/Authenticated/ClientsPage";
import { InvoicesPage } from "./frontend/pages/Authenticated/InvoicesPage";
import { InvoiceFormPage } from "./frontend/pages/Authenticated/InvoiceFormPage";

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -10 }
};
const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.4
};
const MotionWrapper = ({ children }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

export const App = () => {
  const {
    isLoggedIn,
    profile,
    roleId,
    listenAuthState,
    authHydrated,
    isDarkMode,
    toggleTheme
  } = useUserStore();

  const theme = useMemo(
    () => createAppTheme(isDarkMode ? "dark" : "light"),
    [isDarkMode]
  );
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = listenAuthState();
    return () => unsubscribe();
  }, [listenAuthState]);

  const getRedirect = useCallback(() => {
    if (!isLoggedIn) return "/login";
    if (!profile?.fully_onboarded) return "/profile-onboarding";
    return roleId === 1 ? "/admin-dashboard" : "/dashboard";
  }, [isLoggedIn, profile, roleId]);

  // Only show nav when authenticated AND not on onboarding, root landing, or public invoice
  const showNavUI =
    isLoggedIn &&
    location.pathname !== "/profile-onboarding" &&
    location.pathname !== "/" &&
    !location.pathname.startsWith("/invoice/");

  const isLoading = !authHydrated;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FullScreenLoader isLoading={isLoading} />

      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          minHeight: "100vh",
          bgcolor: "background.default"
        }}
      >
        {showNavUI && !isMobile && (
          <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        )}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pb: showNavUI && isMobile ? 10 : 0
          }}
        >
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              {/* Public / Landing */}
              <Route
                path="/"
                element={
                  isLoggedIn ? (
                    <Navigate to={getRedirect()} replace />
                  ) : (
                    <MotionWrapper>
                      <LandingPage />
                    </MotionWrapper>
                  )
                }
              />

              {/* Authentication */}
              <Route
                path="/login"
                element={
                  <MotionWrapper>
                    <LoginPage />
                  </MotionWrapper>
                }
              />
              <Route
                path="/signup"
                element={
                  <MotionWrapper>
                    <SignUpPage />
                  </MotionWrapper>
                }
              />

              {/* Public invoice link */}
              <Route
                path="/invoice/:invoiceId"
                element={
                  <MotionWrapper>
                    <PublicInvoicePage />
                  </MotionWrapper>
                }
              />

              {/* Authenticated */}
              <Route
                path="/profile-onboarding"
                element={
                  <ProtectedRoute>
                    {profile && profile.fully_onboarded ? (
                      <Navigate to="/dashboard" replace />
                    ) : (
                      <MotionWrapper>
                        <OnboardingWizard
                          initialStep={profile ? 2 : 1}
                        />
                      </MotionWrapper>
                    )}
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={[2]}>
                    <MotionWrapper>
                      <UserDashboard />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <ProtectedRoute allowedRoles={[1]}>
                    <MotionWrapper>
                      <AdminDashboard />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/user-profile"
                element={
                  <ProtectedRoute>
                    <MotionWrapper>
                      <UserProfilePage />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <MotionWrapper>
                      <ClientsPage />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <MotionWrapper>
                      <InvoicesPage />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/new"
                element={
                  <ProtectedRoute>
                    <MotionWrapper>
                      <InvoiceFormPage />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/:invoiceId"
                element={
                  <ProtectedRoute>
                    <MotionWrapper>
                      <InvoiceFormPage />
                    </MotionWrapper>
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route
                path="*"
                element={
                  <MotionWrapper>
                    <NotFoundPage />
                  </MotionWrapper>
                }
              />
            </Routes>
          </AnimatePresence>
        </Box>

        {showNavUI && isMobile && (
          <MobileBottomNavigation
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        )}
      </Box>
    </ThemeProvider>
  );
};
