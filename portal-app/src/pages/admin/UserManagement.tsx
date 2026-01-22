import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Select,
  VStack,
  Text,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import type { UserRole } from '../../types';

interface User {
  id: string;
  email: string;
  role: UserRole;
  display_name?: string;
  manager_id?: string;
  profile_completed: boolean;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('Employee');
  const [newManagerId, setNewManagerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<User[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('email');

      if (error) throw error;

      if (data) {
        setUsers(data);

        const managerUsers = data.filter(
          (u) => u.role === 'Manager' || u.role === 'Administrator'
        );
        setManagers(managerUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewManagerId(user.manager_id || '');
    onOpen();
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: newRole,
          manager_id: newManagerId || null,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'User updated successfully',
        status: 'success',
        duration: 3000,
      });

      await fetchUsers();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error updating user',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Administrator':
        return 'purple';
      case 'Manager':
        return 'blue';
      default:
        return 'green';
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          All Users ({users.length})
        </Text>

        <Box overflowX="auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Email</Th>
                <Th>Display Name</Th>
                <Th>Role</Th>
                <Th>Manager</Th>
                <Th>Profile Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>{user.email}</Td>
                  <Td>{user.display_name || '-'}</Td>
                  <Td>
                    <Badge colorScheme={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </Td>
                  <Td>
                    {user.manager_id
                      ? users.find((u) => u.id === user.manager_id)?.email || user.manager_id
                      : '-'}
                  </Td>
                  <Td>
                    <Badge colorScheme={user.profile_completed ? 'green' : 'orange'}>
                      {user.profile_completed ? 'Complete' : 'Incomplete'}
                    </Badge>
                  </Td>
                  <Td>
                    <Button size="sm" onClick={() => handleEditUser(user)}>
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit User</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Email</FormLabel>
                <Text>{selectedUser?.email}</Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Role</FormLabel>
                <Select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="Administrator">Administrator</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Manager</FormLabel>
                <Select
                  value={newManagerId}
                  onChange={(e) => setNewManagerId(e.target.value)}
                  placeholder="Select manager (optional)"
                >
                  {managers
                    .filter((m) => m.id !== selectedUser?.id)
                    .map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.email} ({manager.role})
                      </option>
                    ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdateUser} isLoading={loading}>
              Update
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement;
