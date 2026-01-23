import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    // If loading persists for more than 5 seconds, force logout and cleanup
    if (loading) {
      const timer = setTimeout(async () => {
        console.warn('[ProtectedRoute] Loading timeout exceeded 5 seconds - forcing logout');
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
      }, 5000);

      return () => clearTimeout(timer);
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
