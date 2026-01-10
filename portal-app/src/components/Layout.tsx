import React from 'react';
import {
  Box,
  Flex,
  Button,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  HStack,
  useColorModeValue,
  Container,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon } from '@chakra-ui/icons';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getNavigationItems = () => {
    const items = [
      { label: 'Dashboard', path: '/' },
      { label: 'Profile', path: '/profile' },
      { label: 'Timesheet', path: '/timesheet' },
      { label: 'Leaves', path: '/leaves' },
    ];

    if (userData?.role === 'Manager' || userData?.role === 'Administrator') {
      items.push({ label: 'Manager', path: '/manager' });
    }

    if (userData?.role === 'Administrator') {
      items.push({ label: 'Admin', path: '/admin' });
    }

    return items;
  };

  return (
    <Box minH="100vh" bg={useColorModeValue('gray.50', 'gray.900')}>
      <Box bg={bgColor} px={4} borderBottom="1px" borderColor={borderColor}>
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <HStack spacing={8}>
            <Text fontSize="xl" fontWeight="bold" color="blue.500">
              Gritsa Portal
            </Text>
            <HStack spacing={4}>
              {getNavigationItems().map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                >
                  {item.label}
                </Button>
              ))}
            </HStack>
          </HStack>

          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="ghost">
              <HStack>
                <Avatar size="sm" name={userData?.displayName || userData?.email} />
                <Box textAlign="left">
                  <Text fontSize="sm">{userData?.displayName || userData?.email}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {userData?.role}
                  </Text>
                </Box>
              </HStack>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => navigate('/profile')}>My Profile</MenuItem>
              <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      <Container maxW="container.xl" py={8}>
        {children}
      </Container>
    </Box>
  );
};
