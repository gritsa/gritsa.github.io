import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  useToast,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Textarea,
} from '@chakra-ui/react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  manager_id?: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_comments?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  display_name?: string;
  manager_id?: string;
  project_ids?: string[];
}

interface Timesheet {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  days: Record<number, any>;
  status: 'Draft' | 'Submitted';
}

interface LeaveBalance {
  user_id: string;
  year: number;
  paid_and_sick: number;
  used_paid_and_sick: number;
  national_holidays: number;
  used_national_holidays: number;
}

const ManagerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [reportees, setReportees] = useState<User[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      const { data: reporteesData, error: reporteesError } = await supabase
        .from('users')
        .select('*')
        .eq('manager_id', currentUser.id);

      if (reporteesError) throw reporteesError;

      if (reporteesData) {
        setReportees(reporteesData);

        const reporteeIds = reporteesData.map((r) => r.id);

        if (reporteeIds.length > 0) {
          const { data: leavesData, error: leavesError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('manager_id', currentUser.id)
            .order('applied_at', { ascending: false });

          if (leavesError) throw leavesError;

          if (leavesData) {
            setLeaveRequests(leavesData);
          }

          const { data: timesheetsData, error: timesheetsError } = await supabase
            .from('timesheets')
            .select('*')
            .in('employee_id', reporteeIds);

          if (timesheetsError) throw timesheetsError;

          if (timesheetsData) {
            setTimesheets(timesheetsData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching manager data:', error);
    }
  };

  const handleReviewLeave = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setReviewComments('');
    onOpen();
  };

  const calculateLeaveDays = (leave: LeaveRequest) => {
    const from = new Date(leave.from_date);
    const to = new Date(leave.to_date);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApproveReject = async (approve: boolean) => {
    if (!selectedLeave || !currentUser) return;

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: approve ? 'Approved' : 'Rejected',
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComments,
        })
        .eq('id', selectedLeave.id);

      if (updateError) throw updateError;

      if (approve) {
        const leaveDays = calculateLeaveDays(selectedLeave);

        const { data: balanceData, error: balanceError } = await supabase
          .from('leave_balances')
          .select('*')
          .eq('user_id', selectedLeave.employee_id)
          .eq('year', new Date().getFullYear())
          .single();

        if (balanceError && balanceError.code !== 'PGRST116') {
          throw balanceError;
        }

        if (balanceData) {
          if (selectedLeave.leave_type === 'National Holiday') {
            const { error } = await supabase
              .from('leave_balances')
              .update({
                used_national_holidays: balanceData.used_national_holidays + leaveDays,
              })
              .eq('user_id', selectedLeave.employee_id)
              .eq('year', new Date().getFullYear());

            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('leave_balances')
              .update({
                used_paid_and_sick: balanceData.used_paid_and_sick + leaveDays,
              })
              .eq('user_id', selectedLeave.employee_id)
              .eq('year', new Date().getFullYear());

            if (error) throw error;
          }
        }
      }

      toast({
        title: approve ? 'Leave approved' : 'Leave rejected',
        status: 'success',
        duration: 3000,
      });

      await fetchData();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error processing leave request',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'green';
      case 'Rejected':
        return 'red';
      default:
        return 'yellow';
    }
  };

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Manager Dashboard</Heading>

        <Tabs colorScheme="blue">
          <TabList>
            <Tab>Leave Approvals ({pendingLeaves.length})</Tab>
            <Tab>Team Timesheets</Tab>
            <Tab>My Team ({reportees.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Leave Requests</Heading>
                    {leaveRequests.length === 0 ? (
                      <Text color="gray.500">No leave requests</Text>
                    ) : (
                      <Box overflowX="auto">
                        <Table>
                          <Thead>
                            <Tr>
                              <Th>Employee</Th>
                              <Th>Type</Th>
                              <Th>From</Th>
                              <Th>To</Th>
                              <Th>Days</Th>
                              <Th>Reason</Th>
                              <Th>Status</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {leaveRequests.map((leave) => (
                              <Tr key={leave.id}>
                                <Td>{leave.employee_name}</Td>
                                <Td>{leave.leave_type}</Td>
                                <Td>{new Date(leave.from_date).toLocaleDateString()}</Td>
                                <Td>{new Date(leave.to_date).toLocaleDateString()}</Td>
                                <Td>{calculateLeaveDays(leave)}</Td>
                                <Td>{leave.reason}</Td>
                                <Td>
                                  <Badge colorScheme={getStatusColor(leave.status)}>
                                    {leave.status}
                                  </Badge>
                                </Td>
                                <Td>
                                  {leave.status === 'Pending' && (
                                    <Button size="sm" onClick={() => handleReviewLeave(leave)}>
                                      Review
                                    </Button>
                                  )}
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel>
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Team Timesheets</Heading>
                    {timesheets.length === 0 ? (
                      <Text color="gray.500">No timesheets submitted yet</Text>
                    ) : (
                      <Box overflowX="auto">
                        <Table>
                          <Thead>
                            <Tr>
                              <Th>Employee</Th>
                              <Th>Month</Th>
                              <Th>Year</Th>
                              <Th>Status</Th>
                              <Th>Days Filled</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {timesheets.map((timesheet) => {
                              const employee = reportees.find((r) => r.id === timesheet.employee_id);
                              return (
                                <Tr key={timesheet.id}>
                                  <Td>{employee?.display_name || employee?.email}</Td>
                                  <Td>{timesheet.month + 1}</Td>
                                  <Td>{timesheet.year}</Td>
                                  <Td>
                                    <Badge
                                      colorScheme={timesheet.status === 'Submitted' ? 'green' : 'yellow'}
                                    >
                                      {timesheet.status}
                                    </Badge>
                                  </Td>
                                  <Td>{Object.keys(timesheet.days).length} days</Td>
                                </Tr>
                              );
                            })}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel>
              <Card>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Team Members</Heading>
                    {reportees.length === 0 ? (
                      <Text color="gray.500">No team members reporting to you</Text>
                    ) : (
                      <Box overflowX="auto">
                        <Table>
                          <Thead>
                            <Tr>
                              <Th>Name</Th>
                              <Th>Email</Th>
                              <Th>Role</Th>
                              <Th>Projects</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {reportees.map((reportee) => (
                              <Tr key={reportee.id}>
                                <Td>{reportee.display_name || '-'}</Td>
                                <Td>{reportee.email}</Td>
                                <Td>
                                  <Badge colorScheme="green">{reportee.role}</Badge>
                                </Td>
                                <Td>{reportee.project_ids?.length || 0} projects</Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Leave Request</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedLeave && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold">Employee:</Text>
                  <Text>{selectedLeave.employee_name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Leave Type:</Text>
                  <Text>{selectedLeave.leave_type}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Duration:</Text>
                  <Text>
                    {new Date(selectedLeave.from_date).toLocaleDateString()} to{' '}
                    {new Date(selectedLeave.to_date).toLocaleDateString()}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    ({calculateLeaveDays(selectedLeave)} days)
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Reason:</Text>
                  <Text>{selectedLeave.reason}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Comments (optional):</Text>
                  <Textarea
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Add any comments..."
                    rows={3}
                  />
                </Box>
              </VStack>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={() => handleApproveReject(false)}
              isLoading={loading}
            >
              Reject
            </Button>
            <Button
              colorScheme="green"
              onClick={() => handleApproveReject(true)}
              isLoading={loading}
            >
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default ManagerDashboard;
