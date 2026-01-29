import React, { useState } from 'react';
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
  IconButton,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  useDisclosure,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChevronDownIcon, HamburgerIcon } from '@chakra-ui/icons';
import logo from '../assets/Gritsa-Logo-V2-Subtle.svg';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();

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
      { label: 'Holidays', path: '/holidays' },
    ];

    if (userData?.role === 'Manager' || userData?.role === 'Administrator') {
      items.push({ label: 'Manager', path: '/manager' });
    }

    if (userData?.role === 'Administrator') {
      items.push({ label: 'Admin', path: '/admin' });
    }

    return items;
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Box minH="100vh" bg="#0a0a0a">
      {/* Header */}
      <Box
        bg="rgba(255, 255, 255, 0.03)"
        backdropFilter="blur(10px)"
        borderBottom="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        px={{ base: 4, md: 8 }}
      >
        <Flex h={20} alignItems="center" justifyContent="space-between" maxW="100%" mx="auto">
          {/* Logo */}
          <Image
            src={logo}
            alt="Gritsa Logo"
            h={{ base: '45px', md: '60px' }}
            cursor="pointer"
            onClick={() => navigate('/')}
          />

          {/* Desktop Navigation */}
          <HStack spacing={1} display={{ base: 'none', lg: 'flex' }}>
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

          {/* Desktop User Menu */}
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<ChevronDownIcon />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.100' }}
              _active={{ bg: 'whiteAlpha.200' }}
              display={{ base: 'none', md: 'flex' }}
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

          {/* Mobile Hamburger Menu */}
          <HStack spacing={3} display={{ base: 'flex', md: 'none' }}>
            <Avatar size="sm" name={userData?.displayName || userData?.email} />
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              color="whiteAlpha.900"
              _hover={{ bg: 'whiteAlpha.100' }}
              _active={{ bg: 'whiteAlpha.200' }}
              onClick={onOpen}
            />
          </HStack>
        </Flex>
      </Box>

      {/* Mobile Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent bg="#0a0a0a" borderLeft="1px solid" borderColor="rgba(255, 255, 255, 0.1)">
          <DrawerCloseButton color="whiteAlpha.900" />
          <DrawerHeader borderBottomWidth="1px" borderColor="rgba(255, 255, 255, 0.1)">
            <VStack align="start" spacing={2}>
              <HStack spacing={3}>
                <Avatar size="sm" name={userData?.displayName || userData?.email} />
                <Box>
                  <Text fontSize="sm" fontWeight="600" color="white">
                    {userData?.displayName || userData?.email}
                  </Text>
                  <Text fontSize="xs" color="whiteAlpha.700">
                    {userData?.role}
                  </Text>
                </Box>
              </HStack>
            </VStack>
          </DrawerHeader>

          <DrawerBody pt={6}>
            <VStack spacing={2} align="stretch">
              {getNavigationItems().map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => handleNavigation(item.path)}
                  color="whiteAlpha.900"
                  justifyContent="flex-start"
                  _hover={{
                    bg: 'whiteAlpha.100',
                  }}
                  _active={{
                    bg: 'whiteAlpha.200',
                  }}
                  fontWeight="500"
                  fontSize="md"
                  h="48px"
                >
                  {item.label}
                </Button>
              ))}
              <Box borderTop="1px solid" borderColor="rgba(255, 255, 255, 0.1)" mt={4} pt={4}>
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation('/profile')}
                  color="whiteAlpha.900"
                  justifyContent="flex-start"
                  _hover={{
                    bg: 'whiteAlpha.100',
                  }}
                  w="full"
                  fontWeight="500"
                  fontSize="md"
                  h="48px"
                >
                  My Profile
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  color="red.400"
                  justifyContent="flex-start"
                  _hover={{
                    bg: 'whiteAlpha.100',
                  }}
                  w="full"
                  fontWeight="500"
                  fontSize="md"
                  h="48px"
                >
                  Sign Out
                </Button>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Content - Full Width */}
      <Box px={{ base: 4, md: 8 }} py={{ base: 6, md: 8 }} w="100%">
        {children}
      </Box>
    </Box>
  );
};
