import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  Text,
  Button,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

interface EmployeeProfile {
  full_name: string;
  [key: string]: any;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface LeaveBalance {
  paid_and_sick: number;
  used_paid_and_sick: number;
  national_holidays: number;
  used_national_holidays: number;
}

const Dashboard: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      try {
        // Fetch employee profile
        const { data: profileData } = await supabase
          .from('employee_profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }

        // Fetch projects
        if (userData?.projectIds && userData.projectIds.length > 0) {
          const { data: projectsData } = await supabase
            .from('projects')
            .select('*')
            .in('id', userData.projectIds);

          if (projectsData) {
            setProjects(projectsData);
          }
        }

        // Fetch leave balance
        const { data: balanceData } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('year', new Date().getFullYear())
          .single();

        if (balanceData) {
          setLeaveBalance(balanceData);
        } else {
          // Create initial leave balance if it doesn't exist
          const { data: newBalance } = await supabase
            .from('leave_balances')
            .insert({
              user_id: currentUser.id,
              year: new Date().getFullYear(),
              paid_and_sick: 18,
              national_holidays: 10,
              used_paid_and_sick: 0,
              used_national_holidays: 0,
            })
            .select()
            .single();

          if (newBalance) {
            setLeaveBalance(newBalance);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userData]);

  const remainingPaidLeaves = leaveBalance
    ? leaveBalance.paid_and_sick - leaveBalance.used_paid_and_sick
    : 18;

  const remainingHolidays = leaveBalance
    ? leaveBalance.national_holidays - leaveBalance.used_national_holidays
    : 10;

  return (
    <Layout>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2} color="white">
            Welcome back, {profile?.full_name || userData?.email}!
          </Heading>
          <Text color="whiteAlpha.700">Here's your overview</Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.800">Paid & Sick Leaves</StatLabel>
                <StatNumber color="white">{remainingPaidLeaves}</StatNumber>
                <StatHelpText color="whiteAlpha.600">Remaining this year</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.800">National Holidays</StatLabel>
                <StatNumber color="white">{remainingHolidays}</StatNumber>
                <StatHelpText color="whiteAlpha.600">Available to use</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.800">Active Projects</StatLabel>
                <StatNumber color="white">{projects.length}</StatNumber>
                <StatHelpText color="whiteAlpha.600">Assigned to you</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <Stat>
                <StatLabel color="whiteAlpha.800">Role</StatLabel>
                <StatNumber fontSize="lg" color="white">{userData?.role}</StatNumber>
                <StatHelpText color="whiteAlpha.600">Your position</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md" color="white">Your Projects</Heading>
                {projects.length === 0 ? (
                  <Text color="whiteAlpha.600">No projects assigned yet</Text>
                ) : (
                  projects.map((project) => (
                    <Box
                      key={project.id}
                      p={3}
                      bg="rgba(255, 255, 255, 0.08)"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="rgba(255, 255, 255, 0.1)"
                    >
                      <Text fontWeight="bold" color="white">{project.name}</Text>
                      {project.description && (
                        <Text fontSize="sm" color="whiteAlpha.700">
                          {project.description}
                        </Text>
                      )}
                    </Box>
                  ))
                )}
              </VStack>
            </CardBody>
          </Card>

          <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md" color="white">Quick Actions</Heading>
                <Button
                  variant="gradient"
                  onClick={() => navigate('/timesheet')}
                  width="full"
                >
                  Fill Timesheet
                </Button>
                <Button
                  variant="gradient"
                  onClick={() => navigate('/leaves')}
                  width="full"
                >
                  Apply for Leave
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  width="full"
                  color="whiteAlpha.900"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.1)', borderColor: 'brand.400' }}
                >
                  View Profile
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </SimpleGrid>
      </VStack>
    </Layout>
  );
};

export default Dashboard;
