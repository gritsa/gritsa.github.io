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
  InputGroup,
  InputRightAddon,
  Link,
  Image,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

const Signup: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

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

    if (password.length < 6) {
      toast({
        title: 'Password must be at least 6 characters',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const email = `${username}@gritsa.com`;

      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: 'Account created successfully!',
          description: 'Please sign in to continue.',
          status: 'success',
          duration: 5000,
        });
        navigate('/login');
      }
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error.message || 'An error occurred during sign up',
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
        maxW="440px"
        w="full"
        p={8}
        bg="rgba(255, 255, 255, 0.03)"
        backdropFilter="blur(20px)"
        borderRadius="2xl"
        border="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.37)"
        position="relative"
        zIndex="1"
      >
        <VStack spacing={8}>
          <Image src={logo} alt="Gritsa Logo" h="85px" />

          <VStack spacing={2}>
            <Heading size="lg" color="white" fontWeight="700">
              Create Account
            </Heading>
            <Text color="whiteAlpha.700" fontSize="sm">
              Join the Gritsa team
            </Text>
          </VStack>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <VStack spacing={5}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900" fontSize="sm" fontWeight="600">
                  Username
                </FormLabel>
                <InputGroup>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="john.doe"
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.500' }}
                  />
                  <InputRightAddon
                    bg="rgba(255, 255, 255, 0.05)"
                    borderColor="rgba(255, 255, 255, 0.1)"
                    color="whiteAlpha.700"
                  >
                    @gritsa.com
                  </InputRightAddon>
                </InputGroup>
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
                Create Account
              </Button>
            </VStack>
          </form>

          <Text color="whiteAlpha.700" fontSize="sm">
            Already have an account?{' '}
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

export default Signup;
