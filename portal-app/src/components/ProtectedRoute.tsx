import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spinner, Box } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';

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

  if (loading) {
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
