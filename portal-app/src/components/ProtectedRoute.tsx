import React, { useEffect, useState, useRef } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Spinner, Box } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { supabase } from '../config/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requireProfileComplete?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requireProfileComplete = false,
}) => {
  const { currentUser, userData, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const loadingStartTime = useRef<number | null>(null);

  useEffect(() => {
    // Reset timeout flag when location changes (user navigates)
    setLoadingTimeout(false);
  }, [location.pathname]);

  useEffect(() => {
    // Track when loading starts
    if (loading && loadingStartTime.current === null) {
      loadingStartTime.current = Date.now();
      console.log('[ProtectedRoute] Loading started at:', new Date().toISOString());
    }

    // If loading persists for more than 30 seconds, something is seriously wrong
    // Increased from 10 to 30 seconds to prevent premature logouts
    // This should ONLY trigger in genuinely stuck scenarios
    if (loading) {
      const timer = setTimeout(async () => {
        const elapsedTime = Date.now() - (loadingStartTime.current || Date.now());
        console.warn(`[ProtectedRoute] Loading timeout exceeded 30 seconds (actual: ${elapsedTime}ms) - clearing session`);
        setLoadingTimeout(true);

        // Only clear auth storage, don't force sign out
        // This allows the session to recover on next page load if it's still valid
        localStorage.removeItem('gritsa-portal-auth');

        // Redirect to login for fresh auth check
        navigate('/login', { replace: true });
      }, 30000);

      return () => clearTimeout(timer);
    } else {
      // Reset loading start time when loading completes
      loadingStartTime.current = null;
    }
  }, [loading, navigate]);

  if (loading && !loadingTimeout) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="100vh"
        w="100vw"
        bg="#0a0a0a"
        position="fixed"
        top="0"
        left="0"
      >
        <Spinner size="xl" color="brand.500" thickness="4px" />
      </Box>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!userData) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(userData.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireProfileComplete && !userData.profileCompleted) {
    return <Navigate to="/profile/complete" replace />;
  }

  return <>{children}</>;
};
