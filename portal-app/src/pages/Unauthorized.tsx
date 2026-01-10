import React from 'react';
import { Box, Heading, Text, Button, VStack, Container } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxW="md" centerContent>
      <Box mt={20}>
        <VStack spacing={6}>
          <Heading size="2xl" color="red.500">
            403
          </Heading>
          <Heading size="lg">Unauthorized Access</Heading>
          <Text color="gray.600" textAlign="center">
            You don't have permission to access this page.
          </Text>
          <Button colorScheme="blue" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        </VStack>
      </Box>
    </Container>
  );
};

export default Unauthorized;
