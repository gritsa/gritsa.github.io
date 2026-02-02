import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
  Heading,
  Image,
  FormHelperText,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from '../config/supabase';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

// Create a separate Supabase client for password reset with detectSessionInUrl enabled
// This allows the client to automatically process the redirect from Supabase's verify endpoint
const resetPasswordClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: true, // Enable for password reset to capture tokens from URL
    flowType: 'pkce',
  },
});

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    let timeoutId: number;

    console.log('[ResetPassword] Setting up auth state listener...');

    // Listen to auth state changes - detectSessionInUrl works via events
    const { data: { subscription } } = resetPasswordClient.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('[ResetPassword] Auth event:', event, 'Has session:', !!session);

      if (event === 'PASSWORD_RECOVERY' || (session && session.user)) {
        console.log('[ResetPassword] Valid recovery session detected');
        setValidSession(true);
        // Clear timeout since we found the session
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    // Also check immediately in case session is already in storage
    resetPasswordClient.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      console.log('[ResetPassword] Initial session check:', !!session);

      if (session && session.user) {
        console.log('[ResetPassword] Session already available');
        setValidSession(true);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    // Set a timeout to show error if no session is detected after 3 seconds
    timeoutId = setTimeout(() => {
      if (!mounted) return;

      resetPasswordClient.auth.getSession().then(({ data: { session } }) => {
        if (!session && mounted) {
          console.warn('[ResetPassword] No valid recovery session after timeout');
          toast({
            title: 'Invalid or expired link',
            description: 'Please request a new password reset link.',
            status: 'error',
            duration: 5000,
          });
          setTimeout(() => navigate('/forgot-password'), 2000);
        }
      });
    }, 3000);

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[ResetPassword] Updating password...');

      // Use the reset password client which has the session from URL
      const { error } = await resetPasswordClient.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      console.log('[ResetPassword] Password updated successfully');

      // Sign out from the reset client (doesn't affect main app session)
      await resetPasswordClient.auth.signOut();

      toast({
        title: 'Password updated!',
        description: 'Your password has been successfully reset. Please login with your new password.',
        status: 'success',
        duration: 5000,
      });

      // Redirect to login after short delay
      setTimeout(() => navigate('/login'), 2000);
    } catch (error: any) {
      console.error('[ResetPassword] Update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!validSession) {
    return (
      <Box
        minH="100vh"
        bg="#0a0a0a"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="white">Validating reset link...</Text>
      </Box>
    );
  }

  return (
    <Box
      minH="100vh"
      bg="#0a0a0a"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
    >
      {/* Gradient Background */}
      <Box
        position="absolute"
        top="-50%"
        right="-20%"
        w="800px"
        h="800px"
        bgGradient="radial(circle, brand.500, transparent)"
        opacity="0.15"
        filter="blur(100px)"
      />
      <Box
        position="absolute"
        bottom="-40%"
        left="-20%"
        w="600px"
        h="600px"
        bgGradient="radial(circle, accent.500, transparent)"
        opacity="0.15"
        filter="blur(100px)"
      />

      <Box
        w="440px"
        maxW="90vw"
        p={8}
        bg="rgba(255, 255, 255, 0.03)"
        backdropFilter="blur(20px)"
        borderRadius="2xl"
        border="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.37)"
        position="relative"
        zIndex="1"
        mx="auto"
      >
        <VStack spacing={8}>
          <Image src={logo} alt="Gritsa Logo" h="85px" />

          <VStack spacing={2}>
            <Heading size="lg" color="white" fontWeight="700">
              Set New Password
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm" textAlign="center">
              Choose a strong password for your account
            </Text>
          </VStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900" fontSize="sm" fontWeight="600">
                  New Password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  color="white"
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
                <FormHelperText color="whiteAlpha.600" fontSize="xs">
                  Must be at least 8 characters
                </FormHelperText>
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900" fontSize="sm" fontWeight="600">
                  Confirm Password
                </FormLabel>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  color="white"
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
              </FormControl>

              <Button
                type="submit"
                variant="gradient"
                width="full"
                size="lg"
                isLoading={loading}
                mt={2}
              >
                Update Password
              </Button>
            </VStack>
          </form>
        </VStack>
      </Box>
    </Box>
  );
};

export default ResetPassword;
