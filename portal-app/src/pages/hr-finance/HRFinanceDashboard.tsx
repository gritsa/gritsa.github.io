import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  Text,
  List,
  ListItem,
  Avatar,
  useToast,
} from '@chakra-ui/react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import PayrollTab from './PayrollTab';
import HRTab from './HRTab';

interface Employee {
  id: string;
  email: string;
  display_name?: string;
  role: string;
}

const HRFinanceDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const toast = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, role')
        .order('display_name', { ascending: true });

      if (error) throw error;

      setEmployees(data || []);
      if (data && data.length > 0 && !selectedEmployee) {
        setSelectedEmployee(data[0]);
      }
    } catch (error: any) {
      toast({
        title: 'Error fetching employees',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const isHRFinance = userData?.role === 'HR-Finance' || userData?.role === 'Administrator';

  if (!isHRFinance) {
    return (
      <Layout>
        <Card bg="rgba(255, 255, 255, 0.05)">
          <CardBody>
            <Text color="white">You do not have permission to access this page.</Text>
          </CardBody>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="white">HR & Finance</Heading>

        <HStack spacing={6} align="stretch">
          {/* Employee List Sidebar */}
          <Card
            bg="rgba(255, 255, 255, 0.05)"
            borderColor="rgba(255, 255, 255, 0.1)"
            w="300px"
            h="calc(100vh - 200px)"
            overflowY="auto"
          >
            <CardBody>
              <Heading size="sm" mb={4} color="white">
                Employees
              </Heading>
              <List spacing={2}>
                {employees.map((employee) => (
                  <ListItem
                    key={employee.id}
                    p={3}
                    borderRadius="md"
                    bg={selectedEmployee?.id === employee.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                    cursor="pointer"
                    _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => setSelectedEmployee(employee)}
                  >
                    <HStack>
                      <Avatar
                        size="sm"
                        name={employee.display_name || employee.email}
                      />
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontSize="sm" fontWeight="medium" color="white" noOfLines={1}>
                          {employee.display_name || employee.email}
                        </Text>
                        <Text fontSize="xs" color="whiteAlpha.600">
                          {employee.role}
                        </Text>
                      </VStack>
                    </HStack>
                  </ListItem>
                ))}
              </List>
            </CardBody>
          </Card>

          {/* Main Content Area */}
          <Box flex={1}>
            {selectedEmployee ? (
              <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                <CardBody>
                  <VStack align="stretch" spacing={4}>
                    {/* Employee Header */}
                    <HStack>
                      <Avatar
                        size="md"
                        name={selectedEmployee.display_name || selectedEmployee.email}
                      />
                      <VStack align="start" spacing={0}>
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {selectedEmployee.display_name || selectedEmployee.email}
                        </Text>
                        <Text fontSize="sm" color="whiteAlpha.600">
                          {selectedEmployee.email}
                        </Text>
                      </VStack>
                    </HStack>

                    {/* Tabs for Payroll and HR */}
                    <Tabs variant="enclosed" colorScheme="brand">
                      <TabList>
                        <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
                          Payroll
                        </Tab>
                        <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
                          HR
                        </Tab>
                      </TabList>

                      <TabPanels>
                        <TabPanel>
                          <PayrollTab employeeId={selectedEmployee.id} />
                        </TabPanel>
                        <TabPanel>
                          <HRTab employeeId={selectedEmployee.id} onUpdate={fetchEmployees} />
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <Card bg="rgba(255, 255, 255, 0.05)">
                <CardBody>
                  <Text color="whiteAlpha.700">Select an employee to view details</Text>
                </CardBody>
              </Card>
            )}
          </Box>
        </HStack>
      </VStack>
    </Layout>
  );
};

export default HRFinanceDashboard;
