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
  Image,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon } from '@chakra-ui/icons';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();

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
    <Box minH="100vh" bg="#0a0a0a">
      {/* Header */}
      <Box
        bg="rgba(255, 255, 255, 0.03)"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        px={8}
      >
        <Flex h={20} alignItems="center" justifyContent="space-between" maxW="100%" mx="auto">
          <HStack spacing={12}>
            <Image
              src={logo}
              alt="Gritsa Logo"
              h="60px"
              cursor="pointer"
              onClick={() => navigate('/')}
            />
            <HStack spacing={1}>
              {getNavigationItems().map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => navigate(item.path)}
                  color="whiteAlpha.900"
                  _hover={{
                    bg: 'whiteAlpha.100',
                    transform: 'translateY(-1px)',
                  }}
                  _active={{
                    bg: 'whiteAlpha.200',
                  }}
                  fontWeight="500"
                  fontSize="sm"
                >
                  {item.label}
                </Button>
              ))}
            </HStack>
          </HStack>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.100' }}
              _active={{ bg: 'whiteAlpha.200' }}
            >
              <HStack spacing={3}>
                <Avatar size="sm" name={userData?.displayName || userData?.email} />
                <Box textAlign="left">
                  <Text fontSize="sm" fontWeight="600">
                    {userData?.displayName || userData?.email}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    {userData?.role}
                  </Text>
                </Box>
              </HStack>
            </MenuButton>
            <MenuList bg="rgba(20, 20, 20, 0.95)" backdropFilter="blur(10px)" borderColor="whiteAlpha.200">
              <MenuItem
                onClick={() => navigate('/profile')}
                bg="transparent"
                _hover={{ bg: 'whiteAlpha.100' }}
              >
                My Profile
              </MenuItem>
              <MenuItem
                onClick={handleSignOut}
                bg="transparent"
                _hover={{ bg: 'whiteAlpha.100' }}
              >
                Sign Out
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Box>

      {/* Main Content - Full Width */}
      <Box px={8} py={8} w="100%">
        {children}
      </Box>
    </Box>
  );
};
