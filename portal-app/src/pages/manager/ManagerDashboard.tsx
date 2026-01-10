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
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { LeaveRequest, User, Timesheet, LeaveBalance } from '../../types';

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
      const reporteesQuery = query(
        collection(db, 'users'),
        where('managerId', '==', currentUser.uid)
      );
      const reporteesSnapshot = await getDocs(reporteesQuery);
      const reporteesData = reporteesSnapshot.docs.map((doc) => doc.data() as User);
      setReportees(reporteesData);

      const reporteeIds = reporteesData.map((r) => r.uid);

      if (reporteeIds.length > 0) {
        const leavesQuery = query(
          collection(db, 'leaveRequests'),
          where('managerId', '==', currentUser.uid)
        );
        const leavesSnapshot = await getDocs(leavesQuery);
        const leaves = leavesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LeaveRequest[];
        leaves.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
        setLeaveRequests(leaves);

        const timesheetsSnapshot = await getDocs(collection(db, 'timesheets'));
        const allTimesheets = timesheetsSnapshot.docs.map((doc) => doc.data() as Timesheet);
        const reporteeTimesheets = allTimesheets.filter((t) =>
          reporteeIds.includes(t.employeeId)
        );
        setTimesheets(reporteeTimesheets);
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
    const from = new Date(leave.fromDate);
    const to = new Date(leave.toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleApproveReject = async (approve: boolean) => {
    if (!selectedLeave || !currentUser) return;

    setLoading(true);

    try {
      await updateDoc(doc(db, 'leaveRequests', selectedLeave.id), {
        status: approve ? 'Approved' : 'Rejected',
        reviewedBy: currentUser.uid,
        reviewedAt: new Date(),
        reviewComments: reviewComments,
      });

      if (approve) {
        const leaveDays = calculateLeaveDays(selectedLeave);
        const balanceId = `${selectedLeave.employeeId}_${new Date().getFullYear()}`;
        const balanceDoc = await getDoc(doc(db, 'leaveBalances', balanceId));

        if (balanceDoc.exists()) {
          const balance = balanceDoc.data() as LeaveBalance;

          if (selectedLeave.leaveType === 'National Holiday') {
            await updateDoc(doc(db, 'leaveBalances', balanceId), {
              usedNationalHolidays: balance.usedNationalHolidays + leaveDays,
            });
          } else {
            await updateDoc(doc(db, 'leaveBalances', balanceId), {
              usedPaidAndSick: balance.usedPaidAndSick + leaveDays,
            });
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
                                <Td>{leave.employeeName}</Td>
                                <Td>{leave.leaveType}</Td>
                                <Td>{new Date(leave.fromDate).toLocaleDateString()}</Td>
                                <Td>{new Date(leave.toDate).toLocaleDateString()}</Td>
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
                              const employee = reportees.find((r) => r.uid === timesheet.employeeId);
                              return (
                                <Tr key={timesheet.id}>
                                  <Td>{employee?.displayName || employee?.email}</Td>
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
                              <Tr key={reportee.uid}>
                                <Td>{reportee.displayName || '-'}</Td>
                                <Td>{reportee.email}</Td>
                                <Td>
                                  <Badge colorScheme="green">{reportee.role}</Badge>
                                </Td>
                                <Td>{reportee.projectIds?.length || 0} projects</Td>
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
                  <Text>{selectedLeave.employeeName}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Leave Type:</Text>
                  <Text>{selectedLeave.leaveType}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold">Duration:</Text>
                  <Text>
                    {new Date(selectedLeave.fromDate).toLocaleDateString()} to{' '}
                    {new Date(selectedLeave.toDate).toLocaleDateString()}
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
