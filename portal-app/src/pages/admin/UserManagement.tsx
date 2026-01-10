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
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User, UserRole } from '../../types';

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
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map((doc) => doc.data() as User);
      setUsers(usersData);

      const managerUsers = usersData.filter(
        (u) => u.role === 'Manager' || u.role === 'Administrator'
      );
      setManagers(managerUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setNewManagerId(user.managerId || '');
    onOpen();
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        role: newRole,
        managerId: newManagerId || null,
      });

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
                <Tr key={user.uid}>
                  <Td>{user.email}</Td>
                  <Td>{user.displayName || '-'}</Td>
                  <Td>
                    <Badge colorScheme={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                  </Td>
                  <Td>
                    {user.managerId
                      ? users.find((u) => u.uid === user.managerId)?.email || user.managerId
                      : '-'}
                  </Td>
                  <Td>
                    <Badge colorScheme={user.profileCompleted ? 'green' : 'orange'}>
                      {user.profileCompleted ? 'Complete' : 'Incomplete'}
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
                    .filter((m) => m.uid !== selectedUser?.uid)
                    .map((manager) => (
                      <option key={manager.uid} value={manager.uid}>
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
