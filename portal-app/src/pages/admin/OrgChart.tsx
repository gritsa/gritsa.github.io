import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Card,
  CardBody,
  Badge,
} from '@chakra-ui/react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { User } from '../../types';

const OrgChart: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [orgTree, setOrgTree] = useState<Map<string, User[]>>(new Map());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map((doc) => doc.data() as User);
      setUsers(usersData);

      const tree = new Map<string, User[]>();
      usersData.forEach((user) => {
        const managerId = user.managerId || 'root';
        if (!tree.has(managerId)) {
          tree.set(managerId, []);
        }
        tree.get(managerId)!.push(user);
      });

      setOrgTree(tree);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const renderUserNode = (user: User, level: number = 0) => {
    const reportees = orgTree.get(user.uid) || [];

    return (
      <Box key={user.uid} ml={level * 8} mb={4}>
        <Card>
          <CardBody>
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">{user.displayName || user.email}</Text>
              <Badge colorScheme={
                user.role === 'Administrator' ? 'purple' :
                user.role === 'Manager' ? 'blue' : 'green'
              }>
                {user.role}
              </Badge>
            </VStack>
          </CardBody>
        </Card>
        {reportees.length > 0 && (
          <Box mt={2}>
            {reportees.map((reportee) => renderUserNode(reportee, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  const rootUsers = orgTree.get('root') || [];

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Organization Chart
        </Text>
        {rootUsers.map((user) => renderUserNode(user))}
      </VStack>
    </Box>
  );
};

export default OrgChart;
