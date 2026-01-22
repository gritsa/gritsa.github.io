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
  Container,
  Heading,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (currentUser && userData) {
      if (!userData.profileCompleted) {
        navigate('/profile/complete');
      } else {
        navigate('/');
      }
    }
  }, [currentUser, userData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="md" centerContent>
      <Box mt={20} w="full">
        <Card>
          <CardBody>
            <VStack spacing={6}>
              <Heading size="lg" color="blue.500">
                Gritsa Portal
              </Heading>
              <Text color="gray.600">Sign in to continue</Text>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Email</FormLabel>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@gritsa.com"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Password</FormLabel>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </FormControl>

                  <Button
                    type="submit"
                    colorScheme="blue"
                    width="full"
                    isLoading={loading}
                  >
                    Sign In
                  </Button>
                </VStack>
              </form>

              <Box pt={4} borderTop="1px" borderColor="gray.200" w="full">
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Default Admin: admin@gritsa.com / 123@gritsa
                </Text>
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </Box>
    </Container>
  );
};

export default Login;
