import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Card,
  CardBody,
  Badge,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  manager_id?: string;
}

const OrgChart: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [orgTree, setOrgTree] = useState<Map<string, User[]>>(new Map());

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

        const tree = new Map<string, User[]>();
        data.forEach((user) => {
          const managerId = user.manager_id || 'root';
          if (!tree.has(managerId)) {
            tree.set(managerId, []);
          }
          tree.get(managerId)!.push(user);
        });

        setOrgTree(tree);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const renderUserNode = (user: User, level: number = 0) => {
    const reportees = orgTree.get(user.id) || [];

    return (
      <Box key={user.id} ml={level * 8} mb={4}>
        <Card>
          <CardBody>
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">{user.display_name || user.email}</Text>
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
