import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Card,
  CardBody,
  Button,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
} from '@chakra-ui/react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { LeaveRequest, LeaveType, LeaveBalance, User } from '../types';

const LeaveManagement: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    leaveType: 'Paid' as LeaveType,
    fromDate: '',
    toDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      const leavesQuery = query(
        collection(db, 'leaveRequests'),
        where('employeeId', '==', currentUser.uid)
      );
      const leavesSnapshot = await getDocs(leavesQuery);
      const leaves = leavesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LeaveRequest[];

      leaves.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
      setLeaveRequests(leaves);

      const balanceId = `${currentUser.uid}_${new Date().getFullYear()}`;
      const balanceDoc = await getDoc(doc(db, 'leaveBalances', balanceId));

      if (balanceDoc.exists()) {
        setLeaveBalance(balanceDoc.data() as LeaveBalance);
      } else {
        const newBalance: LeaveBalance = {
          uid: currentUser.uid,
          year: new Date().getFullYear(),
          paidAndSick: 18,
          nationalHolidays: 10,
          usedPaidAndSick: 0,
          usedNationalHolidays: 0,
        };
        await setDoc(doc(db, 'leaveBalances', balanceId), newBalance);
        setLeaveBalance(newBalance);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const calculateLeaveDays = () => {
    if (!formData.fromDate || !formData.toDate) return 0;
    const from = new Date(formData.fromDate);
    const to = new Date(formData.toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleSubmit = async () => {
    if (!currentUser || !userData) return;

    const leaveDays = calculateLeaveDays();

    if (formData.leaveType !== 'National Holiday') {
      const remaining = (leaveBalance?.paidAndSick || 18) - (leaveBalance?.usedPaidAndSick || 0);
      if (leaveDays > remaining) {
        toast({
          title: 'Insufficient leave balance',
          description: `You only have ${remaining} paid/sick leaves remaining`,
          status: 'error',
          duration: 5000,
        });
        return;
      }
    } else {
      const remaining = (leaveBalance?.nationalHolidays || 10) - (leaveBalance?.usedNationalHolidays || 0);
      if (leaveDays > remaining) {
        toast({
          title: 'Insufficient holiday balance',
          description: `You only have ${remaining} national holidays remaining`,
          status: 'error',
          duration: 5000,
        });
        return;
      }
    }

    setLoading(true);

    try {
      let managerId = userData.managerId;

      if (userData.role === 'Manager') {
        const adminsQuery = query(collection(db, 'users'), where('role', '==', 'Administrator'));
        const adminsSnapshot = await getDocs(adminsQuery);
        if (!adminsSnapshot.empty) {
          managerId = adminsSnapshot.docs[0].id;
        }
      }

      const leaveRequest: Omit<LeaveRequest, 'id'> = {
        employeeId: currentUser.uid,
        employeeName: userData.displayName || userData.email || '',
        managerId,
        leaveType: formData.leaveType,
        fromDate: new Date(formData.fromDate) as any,
        toDate: new Date(formData.toDate) as any,
        reason: formData.reason,
        status: 'Pending',
        appliedAt: serverTimestamp() as any,
      };

      await addDoc(collection(db, 'leaveRequests'), leaveRequest);

      toast({
        title: 'Leave request submitted',
        description: 'Your leave request has been submitted for approval',
        status: 'success',
        duration: 3000,
      });

      setFormData({
        leaveType: 'Paid',
        fromDate: '',
        toDate: '',
        reason: '',
      });

      await fetchData();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error submitting leave request',
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

  const remainingPaidLeaves = (leaveBalance?.paidAndSick || 18) - (leaveBalance?.usedPaidAndSick || 0);
  const remainingHolidays = (leaveBalance?.nationalHolidays || 10) - (leaveBalance?.usedNationalHolidays || 0);

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Leave Management</Heading>
          <Button colorScheme="blue" onClick={onOpen}>
            Apply for Leave
          </Button>
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Paid & Sick Leaves</StatLabel>
                <StatNumber>{remainingPaidLeaves}</StatNumber>
                <StatHelpText>
                  Used: {leaveBalance?.usedPaidAndSick || 0} / {leaveBalance?.paidAndSick || 18}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <Stat>
                <StatLabel>National Holidays</StatLabel>
                <StatNumber>{remainingHolidays}</StatNumber>
                <StatHelpText>
                  Used: {leaveBalance?.usedNationalHolidays || 0} / {leaveBalance?.nationalHolidays || 10}
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Leave History</Heading>
              {leaveRequests.length === 0 ? (
                <Text color="gray.500">No leave requests yet</Text>
              ) : (
                <Box overflowX="auto">
                  <Table>
                    <Thead>
                      <Tr>
                        <Th>Type</Th>
                        <Th>From</Th>
                        <Th>To</Th>
                        <Th>Reason</Th>
                        <Th>Status</Th>
                        <Th>Applied</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {leaveRequests.map((leave) => (
                        <Tr key={leave.id}>
                          <Td>{leave.leaveType}</Td>
                          <Td>{new Date(leave.fromDate).toLocaleDateString()}</Td>
                          <Td>{new Date(leave.toDate).toLocaleDateString()}</Td>
                          <Td>{leave.reason}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(leave.status)}>{leave.status}</Badge>
                          </Td>
                          <Td>{new Date(leave.appliedAt).toLocaleDateString()}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Apply for Leave</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Leave Type</FormLabel>
                <Select name="leaveType" value={formData.leaveType} onChange={handleInputChange}>
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="National Holiday">National Holiday</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>From Date</FormLabel>
                <Input
                  type="date"
                  name="fromDate"
                  value={formData.fromDate}
                  onChange={handleInputChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>To Date</FormLabel>
                <Input
                  type="date"
                  name="toDate"
                  value={formData.toDate}
                  onChange={handleInputChange}
                />
              </FormControl>

              {formData.fromDate && formData.toDate && (
                <Box p={3} bg="blue.50" borderRadius="md" w="full">
                  <Text fontSize="sm" fontWeight="bold">
                    Total Days: {calculateLeaveDays()}
                  </Text>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel>Reason</FormLabel>
                <Textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Please provide a reason for your leave"
                  rows={4}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSubmit} isLoading={loading}>
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default LeaveManagement;
