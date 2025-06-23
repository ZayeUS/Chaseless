// File: src/frontend/components/navigation/Sidebar.jsx
import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  User, 
  Users,
  FileText, // Import icon for Invoices
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon,
} from "lucide-react"; 
import { useUserStore } from "../../store/userStore";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../../../firebase";

// Sidebar Item Component - Memoized for performance
const SidebarItem = React.memo(({ icon, label, path, isActive, onClick, isExpanded }) => {
  const theme = useTheme();
  return (
    <Tooltip title={!isExpanded ? label : ""} placement="right" arrow>
      <ListItemButton
        onClick={onClick}
        selected={isActive}
        sx={{
          borderRadius: theme.shape.borderRadius,
          mb: 1,
          px: isExpanded ? 2.5 : 'auto',
          py: 1.25,
          minHeight: 48,
          justifyContent: isExpanded ? "initial" : "center",
          color: isActive ? (theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.primary.main) : theme.palette.text.secondary,
          backgroundColor: isActive ? alpha(theme.palette.primary.main, 0.15) : "transparent",
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            color: theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.primary.main,
          },
          '& .MuiListItemIcon-root': {
            minWidth: 0,
            justifyContent: 'center',
            color: 'inherit',
            marginRight: isExpanded ? 2 : 0,
          },
          transition: theme.transitions.create(['width', 'padding', 'background-color', 'color'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <ListItemIcon>{icon}</ListItemIcon>
        {isExpanded && (
          <ListItemText 
            primary={label} 
            primaryTypographyProps={{ 
              fontWeight: isActive ? 600 : 500, 
              variant: 'body2',
              sx: { whiteSpace: 'nowrap', color: 'inherit' }
            }} 
          />
        )}
      </ListItemButton>
    </Tooltip>
  );
});

// Theme Toggle Component - Memoized for performance
const ThemeToggle = React.memo(({ isExpanded, isDarkMode, toggleTheme }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: isExpanded ? "space-between" : "center",
        p: isExpanded ? 1.5 : 0.5,
        borderRadius: theme.shape.borderRadius,
        my: 1,
      }}
    >
      {isExpanded && (
        <Typography variant="caption" fontWeight={500} color="text.secondary">
          Interface Mode
        </Typography>
      )}
      <Tooltip title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"} placement="top">
        <IconButton
          onClick={toggleTheme}
          size="small"
          sx={{ 
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
              color: theme.palette.primary.main,
            }
          }}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
});

// Main Sidebar Component
export const Sidebar = ({ isMobile, onClose, isDarkMode, toggleTheme }) => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, clearUser } = useUserStore(); 
  
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  useEffect(() => {
    if (!isMobile) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      clearUser();
      navigate("/");
      if (isMobile && onClose) onClose();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const toggleSidebar = () => setIsExpanded(prev => !prev);

  const handleNavigation = (path) => {
    if (!isLoggedIn) {
      navigate("/login"); 
      if (isMobile && onClose) onClose();
      return;
    }

    navigate(path);
    if (isMobile && onClose) onClose();
  };

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: <Home size={20} strokeWidth={2} /> },
    { label: "Invoices", path: "/invoices", icon: <FileText size={20} strokeWidth={2} /> },
    { label: "Clients", path: "/clients", icon: <Users size={20} strokeWidth={2} /> },
    { label: "Profile", path: "/user-profile", icon: <User size={20} strokeWidth={2} /> },
  ];

  const drawerWidth = isExpanded ? 250 : 80;

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? (isExpanded && onClose !== undefined) : true}
      onClose={isMobile ? onClose : undefined}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.drawerPaper || theme.palette.background.paper,
          overflowX: 'hidden',
          transition: theme.transitions.create(['width', 'padding', 'background-color', 'color'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          boxShadow: theme.shadows[2],
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isExpanded ? "space-between" : "center",
            px: isExpanded ? 2.5 : 0,
            height: 64,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          {isExpanded && (
            <Typography 
              variant="h6" 
              fontWeight="bold" 
              color="primary" 
              noWrap 
              component="div"
              onClick={() => navigate('/')}
              sx={{ cursor: 'pointer', ml: 0.5 }}
            >
              ChaseLess
            </Typography>
          )}
          {!isMobile && (
            <IconButton
              onClick={toggleSidebar}
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                '&:hover': { backgroundColor: theme.palette.action.hover },
                mr: isExpanded ? 0.5 : 0,
              }}
            >
              {isExpanded ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
            </IconButton>
          )}
        </Box>

        <Box flexGrow={1} sx={{ overflowY: 'auto', overflowX: 'hidden', p: isExpanded ? 1.5 : 1 }}>
          <List disablePadding>
            {menuItems.map(item => (
              <SidebarItem
                key={item.label}
                {...item}
                isActive={pathname.startsWith(item.path)}
                onClick={() => handleNavigation(item.path)}
                isExpanded={isExpanded}
              />
            ))}
          </List>
        </Box>

        <Box sx={{ p: isExpanded ? 2 : 1, mt: 'auto' }}>
          <ThemeToggle 
            isExpanded={isExpanded} 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
          />
          <Divider sx={{ my: isExpanded ? 1.5 : 1 }} />
          <Tooltip title={!isExpanded ? "Logout" : ""} placement="right" arrow>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: theme.shape.borderRadius,
                py: 1.25,
                px: isExpanded ? 2.5 : 'auto',
                justifyContent: isExpanded ? "initial" : "center",
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                },
                '& .MuiListItemIcon-root': {
                  minWidth: 0,
                  justifyContent: 'center',
                  color: 'inherit',
                  marginRight: isExpanded ? 2 : 0,
                },
              }}
            >
              <ListItemIcon><LogOut size={20} strokeWidth={2.5} /></ListItemIcon>
              {isExpanded && (
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{ fontWeight: 600, variant: 'body2', sx: { whiteSpace: 'nowrap' } }} 
                />
              )}
            </ListItemButton>
          </Tooltip>
        </Box>
      </Box>
    </Drawer>
  );
};