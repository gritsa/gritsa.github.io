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
  HStack,
  Select,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { ViewIcon } from '@chakra-ui/icons';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import TimesheetDetailModal from '../../components/TimesheetDetailModal';
import MonthYearFilter from '../../components/MonthYearFilter';
import ExpenseApprovalsTab from './ExpenseApprovalsTab';
import { sendNotification, getUserInfo } from '../../utils/notifications';
import { getLeaveBalanceSummary } from '../../utils/leaveBalance';
import type { LeaveType } from '../../types';

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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ManagerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [reportees, setReportees] = useState<User[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [timesheetEmployeeName, setTimesheetEmployeeName] = useState('');
  const [reviewComments, setReviewComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [timesheetFilterEmployee, setTimesheetFilterEmployee] = useState('');
  const [timesheetFilterYear, setTimesheetFilterYear] = useState<number | ''>(new Date().getFullYear());
  const [timesheetFilterMonth, setTimesheetFilterMonth] = useState<number | ''>('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isTimesheetOpen,
    onOpen: onTimesheetOpen,
    onClose: onTimesheetClose,
  } = useDisclosure();

  // Apply leave on behalf of a reportee
  const [nationalHolidays, setNationalHolidays] = useState<any[]>([]);
  const [applyReportee, setApplyReportee] = useState<User | null>(null);
  const [applyReporteeBalance, setApplyReporteeBalance] = useState<LeaveBalance | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyFormData, setApplyFormData] = useState({
    leaveType: 'Paid' as LeaveType,
    fromDate: '',
    toDate: '',
    reason: '',
    selectedHolidayId: '',
  });
  const { isOpen: isApplyOpen, onOpen: onApplyOpen, onClose: onApplyClose } = useDisclosure();

  // Award extra paid/sick leave to a reportee
  const [awardReportee, setAwardReportee] = useState<User | null>(null);
  const [awardReporteeBalance, setAwardReporteeBalance] = useState<LeaveBalance | null>(null);
  const [awardDays, setAwardDays] = useState(1);
  const [awardReason, setAwardReason] = useState('');
  const [awardLoading, setAwardLoading] = useState(false);
  const { isOpen: isAwardOpen, onOpen: onAwardOpen, onClose: onAwardClose } = useDisclosure();

  const toast = useToast();

  useEffect(() => {
    fetchData();
    fetchNationalHolidays();
  }, [currentUser]);

  const fetchNationalHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('national_holidays')
        .select('*')
        .eq('year', new Date().getFullYear())
        .eq('is_active', true)
        .order('date', { ascending: true });

      if (error) throw error;
      setNationalHolidays(data || []);
    } catch (error) {
      console.error('Error fetching national holidays:', error);
    }
  };

  const fetchReporteeBalance = async (employeeId: string): Promise<LeaveBalance | null> => {
    const { data } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('user_id', employeeId)
      .eq('year', new Date().getFullYear())
      .single();
    return data || null;
  };

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

      // Notify employee (non-blocking)
      if (selectedLeave) {
        getUserInfo(selectedLeave.employee_id).then((emp) => {
          if (!emp) return;
          const from = new Date(selectedLeave.from_date);
          const to = new Date(selectedLeave.to_date);
          const days = Math.ceil(Math.abs(to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          sendNotification({
            type: 'leave_reviewed',
            to_email: emp.email,
            to_name: emp.name,
            to_user_id: selectedLeave.employee_id,
            data: {
              leave_type: selectedLeave.leave_type,
              from_date: from.toLocaleDateString('en-IN'),
              to_date: to.toLocaleDateString('en-IN'),
              days: String(days),
              status: approve ? 'Approved' : 'Rejected',
              review_comments: reviewComments,
            },
          });
        });
      }

      await fetchData();

      // Refresh leave balances for employees who had their leaves approved
      if (approve) {
        const approvedLeave = selectedLeave;
        const leaveDays = calculateLeaveDays(approvedLeave);

        // This will trigger a refresh on the employee's side when they reload
        // The balance update is handled correctly in the database
      }

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

  const handleViewTimesheet = (timesheet: Timesheet) => {
    const employee = reportees.find((r) => r.id === timesheet.employee_id);
    setSelectedTimesheet(timesheet);
    setTimesheetEmployeeName(employee?.display_name || employee?.email || 'Unknown');
    onTimesheetOpen();
  };

  const openApplyModal = async (reportee: User) => {
    setApplyReportee(reportee);
    setApplyReporteeBalance(null);
    setApplyFormData({
      leaveType: 'Paid',
      fromDate: '',
      toDate: '',
      reason: '',
      selectedHolidayId: '',
    });
    onApplyOpen();
    setApplyReporteeBalance(await fetchReporteeBalance(reportee.id));
  };

  const handleApplyInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setApplyFormData({ ...applyFormData, [e.target.name]: e.target.value });
  };

  const calculateApplyLeaveDays = () => {
    if (!applyFormData.fromDate || !applyFormData.toDate) return 0;
    const from = new Date(applyFormData.fromDate);
    const to = new Date(applyFormData.toDate);
    const diffTime = Math.abs(to.getTime() - from.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const reporteeLeaveRequests = (employeeId: string) =>
    leaveRequests.filter((l) => l.employee_id === employeeId);

  const handleApplyOnBehalf = async () => {
    if (!applyReportee || !currentUser) return;

    let fromDate = applyFormData.fromDate;
    let toDate = applyFormData.toDate;
    let reason = applyFormData.reason;

    if (applyFormData.leaveType === 'National Holiday') {
      if (!applyFormData.selectedHolidayId) {
        toast({ title: 'Please select a holiday', status: 'error', duration: 4000 });
        return;
      }
      const selectedHoliday = nationalHolidays.find((h) => h.id === applyFormData.selectedHolidayId);
      if (!selectedHoliday) {
        toast({ title: 'Invalid holiday selection', status: 'error', duration: 4000 });
        return;
      }
      const alreadyAvailed = reporteeLeaveRequests(applyReportee.id).some(
        (req) => req.leave_type === 'National Holiday' &&
          req.from_date === selectedHoliday.date &&
          req.status === 'Approved'
      );
      if (alreadyAvailed) {
        toast({ title: 'Holiday already availed', description: `${applyReportee.display_name || applyReportee.email} has already availed this holiday`, status: 'error', duration: 5000 });
        return;
      }
      fromDate = selectedHoliday.date;
      toDate = selectedHoliday.date;
      reason = selectedHoliday.name;
    } else {
      if (!fromDate || !toDate || !reason) {
        toast({ title: 'Please fill in all fields', status: 'error', duration: 4000 });
        return;
      }
    }

    setApplyLoading(true);
    try {
      const leaveRequest = {
        employee_id: applyReportee.id,
        employee_name: applyReportee.display_name || applyReportee.email,
        manager_id: currentUser.id,
        leave_type: applyFormData.leaveType,
        from_date: fromDate,
        to_date: toDate,
        reason,
        status: 'Approved' as const,
        applied_at: new Date().toISOString(),
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('leave_requests').insert(leaveRequest);
      if (error) throw error;

      toast({
        title: 'Leave applied and approved',
        description: `Leave has been recorded for ${leaveRequest.employee_name}`,
        status: 'success',
        duration: 4000,
      });

      const days = applyFormData.leaveType === 'National Holiday' ? 1 : calculateApplyLeaveDays();
      sendNotification({
        type: 'leave_applied_by_manager',
        to_email: applyReportee.email,
        to_name: leaveRequest.employee_name,
        to_user_id: applyReportee.id,
        data: {
          leave_type: leaveRequest.leave_type,
          from_date: new Date(fromDate).toLocaleDateString('en-IN'),
          to_date: new Date(toDate).toLocaleDateString('en-IN'),
          days: String(days),
          reason,
        },
      });

      await fetchData();
      onApplyClose();
    } catch (error: any) {
      toast({
        title: 'Error applying leave',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setApplyLoading(false);
    }
  };

  const openAwardModal = async (reportee: User) => {
    setAwardReportee(reportee);
    setAwardReporteeBalance(null);
    setAwardDays(1);
    setAwardReason('');
    onAwardOpen();
    setAwardReporteeBalance(await fetchReporteeBalance(reportee.id));
  };

  const handleAwardLeave = async () => {
    if (!awardReportee || !currentUser) return;
    if (!awardDays || awardDays <= 0) {
      toast({ title: 'Days must be at least 1', status: 'error', duration: 4000 });
      return;
    }

    setAwardLoading(true);
    try {
      const year = new Date().getFullYear();

      if (awardReporteeBalance) {
        const { error } = await supabase
          .from('leave_balances')
          .update({ paid_and_sick: awardReporteeBalance.paid_and_sick + awardDays })
          .eq('user_id', awardReportee.id)
          .eq('year', year);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('leave_balances').insert({
          user_id: awardReportee.id,
          year,
          paid_and_sick: 18 + awardDays,
          national_holidays: 10,
          used_paid_and_sick: 0,
          used_national_holidays: 0,
        });
        if (error) throw error;
      }

      const { error: grantError } = await supabase.from('leave_grants').insert({
        employee_id: awardReportee.id,
        granted_by: currentUser.id,
        year,
        days: awardDays,
        reason: awardReason || null,
      });
      if (grantError) throw grantError;

      toast({
        title: 'Leave awarded',
        description: `${awardDays} extra day(s) added for ${awardReportee.display_name || awardReportee.email}`,
        status: 'success',
        duration: 4000,
      });

      sendNotification({
        type: 'leave_awarded',
        to_email: awardReportee.email,
        to_name: awardReportee.display_name || awardReportee.email,
        to_user_id: awardReportee.id,
        data: {
          days: String(awardDays),
          reason: awardReason || '',
        },
      });

      onAwardClose();
    } catch (error: any) {
      toast({
        title: 'Error awarding leave',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setAwardLoading(false);
    }
  };

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');

  const filteredTimesheets = timesheets
    .filter((t) => {
      if (timesheetFilterEmployee && t.employee_id !== timesheetFilterEmployee) return false;
      if (timesheetFilterYear !== '' && t.year !== timesheetFilterYear) return false;
      if (timesheetFilterMonth !== '' && t.month !== timesheetFilterMonth) return false;
      return true;
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);

  const availableYears = [...new Set(timesheets.map((t) => t.year))].sort((a, b) => b - a);
  if (!availableYears.includes(new Date().getFullYear())) {
    availableYears.unshift(new Date().getFullYear());
  }

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Manager Dashboard</Heading>

        <Tabs colorScheme="blue">
          <TabList>
            <Tab>Leave Approvals ({pendingLeaves.length})</Tab>
            <Tab>Team Timesheets</Tab>
            <Tab>Expense Approvals</Tab>
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
                    <HStack spacing={4} flexWrap="wrap">
                      <Select
                        placeholder="All Employees"
                        value={timesheetFilterEmployee}
                        onChange={(e) => setTimesheetFilterEmployee(e.target.value)}
                        maxW="220px"
                        size="sm"
                      >
                        {reportees.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.display_name || r.email}
                          </option>
                        ))}
                      </Select>
                      <MonthYearFilter
                        month={timesheetFilterMonth}
                        year={timesheetFilterYear}
                        onMonthChange={setTimesheetFilterMonth}
                        onYearChange={setTimesheetFilterYear}
                        monthOffset={0}
                        years={availableYears}
                        allowAll
                      />
                    </HStack>
                    {filteredTimesheets.length === 0 ? (
                      <Text color="gray.500">No timesheets found</Text>
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
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {filteredTimesheets.map((timesheet) => {
                              const employee = reportees.find((r) => r.id === timesheet.employee_id);
                              return (
                                <Tr key={timesheet.id}>
                                  <Td>{employee?.display_name || employee?.email}</Td>
                                  <Td>{MONTHS[timesheet.month]}</Td>
                                  <Td>{timesheet.year}</Td>
                                  <Td>
                                    <Badge
                                      colorScheme={timesheet.status === 'Submitted' ? 'green' : 'yellow'}
                                    >
                                      {timesheet.status}
                                    </Badge>
                                  </Td>
                                  <Td>{Object.keys(timesheet.days).length} days</Td>
                                  <Td>
                                    <Button
                                      size="sm"
                                      leftIcon={<ViewIcon />}
                                      variant="outline"
                                      colorScheme="blue"
                                      onClick={() => handleViewTimesheet(timesheet)}
                                    >
                                      View Details
                                    </Button>
                                  </Td>
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
                  <ExpenseApprovalsTab
                    reporteeIds={reportees.map((r) => r.id)}
                    reportees={reportees}
                  />
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
                              <Th>Actions</Th>
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
                                <Td>
                                  <HStack spacing={2}>
                                    <Button size="sm" onClick={() => openApplyModal(reportee)}>
                                      Apply Leave
                                    </Button>
                                    <Button size="sm" colorScheme="purple" variant="outline" onClick={() => openAwardModal(reportee)}>
                                      Award Leave
                                    </Button>
                                  </HStack>
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
          </TabPanels>
        </Tabs>
      </VStack>

      <TimesheetDetailModal
        isOpen={isTimesheetOpen}
        onClose={onTimesheetClose}
        timesheet={selectedTimesheet}
        employeeName={timesheetEmployeeName}
      />

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

      {/* Apply Leave on Behalf of Reportee */}
      <Modal isOpen={isApplyOpen} onClose={onApplyClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Apply Leave for {applyReportee?.display_name || applyReportee?.email}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              {applyReporteeBalance && (
                <Box p={3} bg="blue.50" borderRadius="md" w="full">
                  <Text fontSize="sm" color="blue.800">
                    Current Paid & Sick balance: {
                      getLeaveBalanceSummary(applyReporteeBalance, reporteeLeaveRequests(applyReportee?.id || '')).remainingPaidSick
                    } remaining
                  </Text>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel>Leave Type</FormLabel>
                <Select name="leaveType" value={applyFormData.leaveType} onChange={handleApplyInputChange}>
                  <option value="Paid">Paid Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="National Holiday">National Holiday</option>
                </Select>
                {applyFormData.leaveType !== 'National Holiday' && (
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Tip: even on a national holiday, choose Paid or Sick here to preserve their
                    national holiday credit and deduct from paid leave instead.
                  </Text>
                )}
              </FormControl>

              {applyFormData.leaveType === 'National Holiday' ? (
                <FormControl isRequired>
                  <FormLabel>Select Holiday</FormLabel>
                  <Select
                    name="selectedHolidayId"
                    value={applyFormData.selectedHolidayId}
                    onChange={handleApplyInputChange}
                    placeholder="Choose a holiday"
                  >
                    {nationalHolidays.map((holiday) => {
                      const alreadyAvailed = applyReportee
                        ? reporteeLeaveRequests(applyReportee.id).some(
                          (req) => req.leave_type === 'National Holiday' &&
                            req.from_date === holiday.date &&
                            req.status === 'Approved'
                        )
                        : false;
                      return (
                        <option key={holiday.id} value={holiday.id} disabled={alreadyAvailed}>
                          {holiday.name} - {new Date(holiday.date).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long', weekday: 'short',
                          })}
                          {alreadyAvailed ? ' (Already Availed)' : ''}
                        </option>
                      );
                    })}
                  </Select>
                </FormControl>
              ) : (
                <>
                  <FormControl isRequired>
                    <FormLabel>From Date</FormLabel>
                    <Input
                      type="date"
                      name="fromDate"
                      value={applyFormData.fromDate}
                      onChange={handleApplyInputChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>To Date</FormLabel>
                    <Input
                      type="date"
                      name="toDate"
                      value={applyFormData.toDate}
                      onChange={handleApplyInputChange}
                    />
                  </FormControl>

                  {applyFormData.fromDate && applyFormData.toDate && (
                    <Box p={3} bg="blue.50" borderRadius="md" w="full">
                      <Text fontSize="sm" fontWeight="bold" color="blue.800">
                        Total Days: {calculateApplyLeaveDays()}
                      </Text>
                    </Box>
                  )}

                  <FormControl isRequired>
                    <FormLabel>Reason</FormLabel>
                    <Textarea
                      name="reason"
                      value={applyFormData.reason}
                      onChange={handleApplyInputChange}
                      placeholder="Why is this leave being applied on their behalf?"
                      rows={3}
                    />
                  </FormControl>
                </>
              )}

              <Box p={3} bg="green.50" borderRadius="md" w="full">
                <Text fontSize="sm" fontWeight="bold" color="green.800">
                  This leave will be recorded as already approved.
                </Text>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onApplyClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleApplyOnBehalf} isLoading={applyLoading}>
              Apply & Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Award Extra Leave */}
      <Modal isOpen={isAwardOpen} onClose={onAwardClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Award Leave to {awardReportee?.display_name || awardReportee?.email}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.500">
                Adds extra days to this employee's Paid & Sick leave balance for {new Date().getFullYear()}
                — for example, compensating overtime or weekend work.
              </Text>

              {awardReporteeBalance && (
                <Box p={3} bg="blue.50" borderRadius="md" w="full">
                  <Text fontSize="sm" color="blue.800">
                    Current Paid & Sick total: {awardReporteeBalance.paid_and_sick} days
                  </Text>
                </Box>
              )}

              <FormControl isRequired>
                <FormLabel>Days to Award</FormLabel>
                <NumberInput min={1} value={awardDays} onChange={(_, val) => setAwardDays(isNaN(val) ? 0 : val)}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Reason</FormLabel>
                <Textarea
                  value={awardReason}
                  onChange={(e) => setAwardReason(e.target.value)}
                  placeholder="e.g. Compensatory leave for weekend deployment support"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAwardClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleAwardLeave} isLoading={awardLoading}>
              Award Leave
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default ManagerDashboard;
