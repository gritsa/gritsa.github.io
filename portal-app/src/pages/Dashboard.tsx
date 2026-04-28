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
  const [leaveHistory, setLeaveHistory] = useState<any[]>([]);
  const [usingCalculatedBalance, setUsingCalculatedBalance] = useState(false);

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

        // Fetch leave history for fallback calculation
        const { data: leaveHistoryData } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', currentUser.id)
          .order('applied_at', { ascending: false });

        if (leaveHistoryData) {
          setLeaveHistory(leaveHistoryData);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, userData]);

  const calculateUsedLeaveDaysFromHistory = (leaveHistory: any[]) => {
    let totalUsedPaidSickDays = 0;
    let totalUsedHolidayDays = 0;

    leaveHistory.forEach(leave => {
      if (leave.status === 'Approved') {
        const from = new Date(leave.from_date);
        const to = new Date(leave.to_date);
        const diffTime = Math.abs(to.getTime() - from.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (leave.leave_type === 'Paid' || leave.leave_type === 'Sick') {
          totalUsedPaidSickDays += days;
        } else if (leave.leave_type === 'National Holiday') {
          totalUsedHolidayDays += days;
        }
      }
    });

    return {
      paidSick: totalUsedPaidSickDays,
      nationalHolidays: totalUsedHolidayDays
    };
  };

  const calculateRemainingPaidLeaves = (balance: LeaveBalance | null, history: any[]) => {
    if (!balance) return 18; // Default fallback

    // Check if balance data is likely incorrect (used_paid_and_sick is 0 but there are approved leaves)
    const usedDaysFromHistory = calculateUsedLeaveDaysFromHistory(history);
    if (balance.used_paid_and_sick === 0 && usedDaysFromHistory.paidSick > 0) {
      return balance.paid_and_sick - usedDaysFromHistory.paidSick;
    }

    return balance.paid_and_sick - balance.used_paid_and_sick;
  };

  const calculateRemainingHolidays = (balance: LeaveBalance | null, history: any[]) => {
    if (!balance) return 10; // Default fallback

    // Check if balance data is likely incorrect (used_national_holidays is 0 but there are approved holidays)
    const usedDaysFromHistory = calculateUsedLeaveDaysFromHistory(history);
    if (balance.used_national_holidays === 0 && usedDaysFromHistory.nationalHolidays > 0) {
      return balance.national_holidays - usedDaysFromHistory.nationalHolidays;
    }

    return balance.national_holidays - balance.used_national_holidays;
  };

const remainingPaidLeaves = calculateRemainingPaidLeaves(leaveBalance, leaveHistory);
const remainingHolidays = calculateRemainingHolidays(leaveBalance, leaveHistory);

// Check if we're using calculated balance
const usingCalculatedPaidLeaves = leaveBalance?.used_paid_and_sick === 0 &&
  leaveHistory.some(leave => leave.status === 'Approved' &&
    (leave.leave_type === 'Paid' || leave.leave_type === 'Sick'));

const usingCalculatedHolidays = leaveBalance?.used_national_holidays === 0 &&
  leaveHistory.some(leave => leave.status === 'Approved' &&
    leave.leave_type === 'National Holiday');

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
              <StatHelpText color="whiteAlpha.600">
                Remaining this year
                {usingCalculatedPaidLeaves && ' (calculated from history)'}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
          <CardBody>
            <Stat>
              <StatLabel color="whiteAlpha.800">National Holidays</StatLabel>
              <StatNumber color="white">{remainingHolidays}</StatNumber>
              <StatHelpText color="whiteAlpha.600">
                Available to use
                {usingCalculatedHolidays && ' (calculated from history)'}
              </StatHelpText>
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
