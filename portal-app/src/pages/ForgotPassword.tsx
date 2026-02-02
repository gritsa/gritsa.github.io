import React, { useState } from 'react';
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
import { supabase } from '../config/supabase';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Email sent!',
        description: 'Check your email for the password reset link.',
        status: 'success',
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reset email',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
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
              {emailSent ? 'Check Your Email' : 'Reset Password'}
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm" textAlign="center">
              {emailSent
                ? 'We sent you an email with a link to reset your password.'
                : 'Enter your email and we\'ll send you a reset link'}
            </Text>
          </VStack>

          {!emailSent && (
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

                <Button
                  type="submit"
                  variant="gradient"
                  width="full"
                  size="lg"
                  isLoading={loading}
                  mt={2}
                >
                  Send Reset Link
                </Button>
              </VStack>
            </form>
          )}

          {emailSent && (
            <Button
              variant="gradient"
              width="full"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          )}

          <Text color="whiteAlpha.700" fontSize="sm">
            Remember your password?{' '}
            <Link
              color="brand.400"
              fontWeight="600"
              onClick={() => navigate('/login')}
              _hover={{ color: 'brand.300' }}
            >
              Sign in
            </Link>
          </Text>
        </VStack>
      </Box>
    </Box>
  );
};

export default ForgotPassword;
