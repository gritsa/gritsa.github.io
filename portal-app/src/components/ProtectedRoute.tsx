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

    // If loading persists for more than 10 seconds, force logout and cleanup
    // Increased from 5 to 10 seconds to avoid false positives during navigation
    if (loading) {
      const timer = setTimeout(async () => {
        const elapsedTime = Date.now() - (loadingStartTime.current || Date.now());
        console.warn(`[ProtectedRoute] Loading timeout exceeded 10 seconds (actual: ${elapsedTime}ms) - forcing logout`);
        setLoadingTimeout(true);

        // Force sign out and clear all storage
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('[ProtectedRoute] Error during forced sign out:', error);
        }

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Redirect to login
        navigate('/login', { replace: true });
      }, 10000);

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
