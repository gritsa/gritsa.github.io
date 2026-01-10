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
  HStack,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { EmployeeProfile, Project, LeaveBalance } from '../types';

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
        const profileDoc = await getDoc(doc(db, 'employeeProfiles', currentUser.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as EmployeeProfile);
        }

        if (userData?.projectIds && userData.projectIds.length > 0) {
          const projectPromises = userData.projectIds.map((id) =>
            getDoc(doc(db, 'projects', id))
          );
          const projectDocs = await Promise.all(projectPromises);
          const projectData = projectDocs
            .filter((doc) => doc.exists())
            .map((doc) => ({ id: doc.id, ...doc.data() } as Project));
          setProjects(projectData);
        }

        const leaveBalanceDoc = await getDoc(
          doc(db, 'leaveBalances', `${currentUser.uid}_${new Date().getFullYear()}`)
        );
        if (leaveBalanceDoc.exists()) {
          setLeaveBalance(leaveBalanceDoc.data() as LeaveBalance);
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
    ? leaveBalance.paidAndSick - leaveBalance.usedPaidAndSick
    : 18;

  const remainingHolidays = leaveBalance
    ? leaveBalance.nationalHolidays - leaveBalance.usedNationalHolidays
    : 10;

  return (
    <Layout>
      <VStack spacing={8} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>
            Welcome back, {profile?.personalDetails.fullName || userData?.email}!
          </Heading>
          <Text color="gray.600">Here's your overview</Text>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Paid & Sick Leaves</StatLabel>
                <StatNumber>{remainingPaidLeaves}</StatNumber>
                <StatHelpText>Remaining this year</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>National Holidays</StatLabel>
                <StatNumber>{remainingHolidays}</StatNumber>
                <StatHelpText>Available to use</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Active Projects</StatLabel>
                <StatNumber>{projects.length}</StatNumber>
                <StatHelpText>Assigned to you</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Role</StatLabel>
                <StatNumber fontSize="lg">{userData?.role}</StatNumber>
                <StatHelpText>Your position</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">Your Projects</Heading>
                {projects.length === 0 ? (
                  <Text color="gray.500">No projects assigned yet</Text>
                ) : (
                  projects.map((project) => (
                    <Box key={project.id} p={3} bg="gray.50" borderRadius="md">
                      <Text fontWeight="bold">{project.name}</Text>
                      {project.description && (
                        <Text fontSize="sm" color="gray.600">
                          {project.description}
                        </Text>
                      )}
                    </Box>
                  ))
                )}
              </VStack>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <VStack align="stretch" spacing={4}>
                <Heading size="md">Quick Actions</Heading>
                <Button
                  colorScheme="blue"
                  onClick={() => navigate('/timesheet')}
                  width="full"
                >
                  Fill Timesheet
                </Button>
                <Button
                  colorScheme="green"
                  onClick={() => navigate('/leaves')}
                  width="full"
                >
                  Apply for Leave
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                  width="full"
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
