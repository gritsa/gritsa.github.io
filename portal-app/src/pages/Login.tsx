import React, { useState, useEffect, useRef } from 'react';
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
  Link,
  Image,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const loginAttemptTime = useRef<number | null>(null);
  const recoveryAttempted = useRef(false);

  useEffect(() => {
    if (currentUser && userData) {
      if (!userData.profileCompleted) {
        navigate('/profile/complete');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, userData, navigate]);

  // Auto-recovery mechanism: if login is stuck for more than 8 seconds, clear storage and allow retry
  useEffect(() => {
    if (loading && !recoveryAttempted.current) {
      const timer = setTimeout(() => {
        console.warn('[Login] Login stuck for 8 seconds - attempting auto-recovery');

        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();

        // Reset loading state
        setLoading(false);
        recoveryAttempted.current = true;

        toast({
          title: 'Login timeout detected',
          description: 'Storage cleared. Please try logging in again.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [loading, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loginAttemptTime.current = Date.now();
    recoveryAttempted.current = false;

    try {
      await signIn(email, password);
      toast({
        title: 'Welcome back!',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      // If login fails due to session issues, clear storage and suggest retry
      if (error.message?.includes('session') || error.message?.includes('token')) {
        console.error('[Login] Session-related error detected, clearing storage');
        localStorage.clear();
        sessionStorage.clear();

        toast({
          title: 'Session error detected',
          description: 'Storage cleared. Please try logging in again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Login failed',
          description: error.message,
          status: 'error',
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
      loginAttemptTime.current = null;
    }
  };

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
              Welcome Back
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm">
              Sign in to your Gritsa account
            </Text>
          </VStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900" fontSize="sm" fontWeight="600">
                  Email
                </FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gritsa.com"
                  color="white"
                  _placeholder={{ color: 'whiteAlpha.500' }}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900" fontSize="sm" fontWeight="600">
                  Password
                </FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                Sign In
              </Button>
            </VStack>
          </form>

          <Text color="whiteAlpha.700" fontSize="sm">
            Don't have an account?{' '}
            <Link
              color="brand.400"
              fontWeight="600"
              onClick={() => navigate('/signup')}
              _hover={{ color: 'brand.300' }}
            >
              Sign up
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default Login;
