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
import { supabase } from '../config/supabase';
import type { LeaveType } from '../types';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  manager_id?: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  applied_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface LeaveBalance {
  user_id: string;
  year: number;
  paid_and_sick: number;
  used_paid_and_sick: number;
  national_holidays: number;
  used_national_holidays: number;
}

const LeaveManagement: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [nationalHolidays, setNationalHolidays] = useState<any[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    leaveType: 'Paid' as LeaveType,
    fromDate: '',
    toDate: '',
    reason: '',
    selectedHolidayId: '',
  });

  useEffect(() => {
    fetchData();
    fetchNationalHolidays();
  }, [currentUser]);

  const fetchNationalHolidays = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await supabase
        .from('national_holidays')
        .select('*')
        .eq('year', currentYear)
        .eq('is_active', true)
        .order('date', { ascending: true });

      if (error) throw error;

      setNationalHolidays(data || []);
    } catch (error) {
      console.error('Error fetching national holidays:', error);
    }
  };

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      const { data: leavesData, error: leavesError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', currentUser.id)
        .order('applied_at', { ascending: false });

      if (leavesError) throw leavesError;

      if (leavesData) {
        setLeaveRequests(leavesData);
      }

      const { data: balanceData, error: balanceError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('year', new Date().getFullYear())
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }

      if (balanceData) {
        setLeaveBalance(balanceData);
      } else {
        const newBalance = {
          user_id: currentUser.id,
          year: new Date().getFullYear(),
          paid_and_sick: 18,
          national_holidays: 10,
          used_paid_and_sick: 0,
          used_national_holidays: 0,
        };

        const { data: insertedBalance, error: insertError } = await supabase
          .from('leave_balances')
          .insert(newBalance)
          .select()
          .single();

        if (insertError) throw insertError;

        if (insertedBalance) {
          setLeaveBalance(insertedBalance);
        }
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

    // For National Holidays, validate selection
    if (formData.leaveType === 'National Holiday') {
      if (!formData.selectedHolidayId) {
        toast({
          title: 'Please select a holiday',
          description: 'You must select a national holiday from the list',
          status: 'error',
          duration: 5000,
        });
        return;
      }

      const selectedHoliday = nationalHolidays.find(h => h.id === formData.selectedHolidayId);
      if (!selectedHoliday) {
        toast({
          title: 'Invalid holiday selection',
          status: 'error',
          duration: 5000,
        });
        return;
      }

      // Check if already availed
      const existingRequest = leaveRequests.find(
        req => req.leave_type === 'National Holiday' &&
               req.from_date === selectedHoliday.date &&
               req.status === 'Approved'
      );

      if (existingRequest) {
        toast({
          title: 'Holiday already availed',
          description: 'You have already availed this national holiday',
          status: 'error',
          duration: 5000,
        });
        return;
      }
    } else {
      // For Paid/Sick leaves, check balance
      const leaveDays = calculateLeaveDays();
      const remaining = (leaveBalance?.paid_and_sick || 18) - (leaveBalance?.used_paid_and_sick || 0);
      if (leaveDays > remaining) {
        toast({
          title: 'Insufficient leave balance',
          description: `You only have ${remaining} paid/sick leaves remaining`,
          status: 'error',
          duration: 5000,
        });
        return;
      }
    }

    setLoading(true);

    try {
      let managerId = userData.managerId;
      let status: 'Pending' | 'Approved' = 'Pending';
      let autoApprovedAt: string | undefined;

      // National Holidays are auto-approved
      if (formData.leaveType === 'National Holiday') {
        status = 'Approved';
        autoApprovedAt = new Date().toISOString();

        // Update balance immediately for national holidays
        if (leaveBalance) {
          const { error: balanceError } = await supabase
            .from('leave_balances')
            .update({
              used_national_holidays: (leaveBalance.used_national_holidays || 0) + 1,
            })
            .eq('user_id', currentUser.id)
            .eq('year', new Date().getFullYear());

          if (balanceError) throw balanceError;
        }
      } else {
        // Regular leaves need manager approval
        if (userData.role === 'Manager') {
          const { data: adminsData } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'Administrator')
            .limit(1)
            .single();

          if (adminsData) {
            managerId = adminsData.id;
          }
        }
      }

      // Get holiday details if applicable
      let fromDate = formData.fromDate;
      let toDate = formData.toDate;
      let reason = formData.reason;

      if (formData.leaveType === 'National Holiday' && formData.selectedHolidayId) {
        const selectedHoliday = nationalHolidays.find(h => h.id === formData.selectedHolidayId);
        if (selectedHoliday) {
          fromDate = selectedHoliday.date;
          toDate = selectedHoliday.date;
          reason = selectedHoliday.name;
        }
      }

      const leaveRequest = {
        employee_id: currentUser.id,
        employee_name: userData.displayName || userData.email || '',
        manager_id: managerId,
        leave_type: formData.leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason: reason,
        status: status,
        applied_at: new Date().toISOString(),
        ...(autoApprovedAt && { reviewed_at: autoApprovedAt }),
      };

      const { error } = await supabase
        .from('leave_requests')
        .insert(leaveRequest);

      if (error) throw error;

      toast({
        title: status === 'Approved' ? 'Holiday availed successfully' : 'Leave request submitted',
        description: status === 'Approved'
          ? 'The national holiday has been added to your calendar'
          : 'Your leave request has been submitted for approval',
        status: 'success',
        duration: 3000,
      });

      setFormData({
        leaveType: 'Paid',
        fromDate: '',
        toDate: '',
        reason: '',
        selectedHolidayId: '',
      });

      await fetchData();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error submitting request',
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

  const remainingPaidLeaves = (leaveBalance?.paid_and_sick || 18) - (leaveBalance?.used_paid_and_sick || 0);
  const remainingHolidays = (leaveBalance?.national_holidays || 10) - (leaveBalance?.used_national_holidays || 0);

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
                  Used: {leaveBalance?.used_paid_and_sick || 0} / {leaveBalance?.paid_and_sick || 18}
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
                  Used: {leaveBalance?.used_national_holidays || 0} / {leaveBalance?.national_holidays || 10}
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
                          <Td>{leave.leave_type}</Td>
                          <Td>{new Date(leave.from_date).toLocaleDateString()}</Td>
                          <Td>{new Date(leave.to_date).toLocaleDateString()}</Td>
                          <Td>{leave.reason}</Td>
                          <Td>
                            <Badge colorScheme={getStatusColor(leave.status)}>{leave.status}</Badge>
                          </Td>
                          <Td>{new Date(leave.applied_at).toLocaleDateString()}</Td>
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

              {formData.leaveType === 'National Holiday' ? (
                <>
                  <FormControl isRequired>
                    <FormLabel>Select Holiday</FormLabel>
                    <Select
                      name="selectedHolidayId"
                      value={formData.selectedHolidayId}
                      onChange={handleInputChange}
                      placeholder="Choose a holiday"
                    >
                      {nationalHolidays.map((holiday) => {
                        const alreadyAvailed = leaveRequests.some(
                          req => req.leave_type === 'National Holiday' &&
                                 req.from_date === holiday.date &&
                                 req.status === 'Approved'
                        );
                        return (
                          <option
                            key={holiday.id}
                            value={holiday.id}
                            disabled={alreadyAvailed}
                          >
                            {holiday.name} - {new Date(holiday.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'long',
                              weekday: 'short'
                            })}
                            {alreadyAvailed ? ' (Already Availed)' : ''}
                          </option>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {nationalHolidays.length === 0 && (
                    <Box p={3} bg="yellow.50" borderRadius="md" w="full">
                      <Text fontSize="sm" color="yellow.800">
                        No national holidays configured for {new Date().getFullYear()}. Please contact admin.
                      </Text>
                    </Box>
                  )}

                  <Box p={3} bg="blue.50" borderRadius="md" w="full">
                    <Text fontSize="sm" fontWeight="bold" color="blue.800">
                      ℹ️ National holidays are automatically approved
                    </Text>
                  </Box>
                </>
              ) : (
                <>
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
                </>
              )}
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
