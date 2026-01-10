import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Card,
  CardBody,
  Button,
  useToast,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Textarea,
  HStack,
  Badge,
  Text,
} from '@chakra-ui/react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Timesheet as TimesheetType, TimesheetDayType } from '../types';

const Timesheet: React.FC = () => {
  const { currentUser } = useAuth();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [timesheet, setTimesheet] = useState<TimesheetType | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    fetchTimesheet();
  }, [month, year, currentUser]);

  const fetchTimesheet = async () => {
    if (!currentUser) return;

    try {
      const timesheetId = `${currentUser.uid}_${year}_${month}`;
      const timesheetDoc = await getDoc(doc(db, 'timesheets', timesheetId));

      if (timesheetDoc.exists()) {
        setTimesheet(timesheetDoc.data() as TimesheetType);
      } else {
        const newTimesheet: TimesheetType = {
          id: timesheetId,
          employeeId: currentUser.uid,
          month,
          year,
          days: {},
          status: 'Draft',
        };
        setTimesheet(newTimesheet);
      }
    } catch (error) {
      console.error('Error fetching timesheet:', error);
    }
  };

  const handleDayTypeChange = (day: number, type: TimesheetDayType) => {
    if (!timesheet) return;

    setTimesheet({
      ...timesheet,
      days: {
        ...timesheet.days,
        [day]: {
          type,
          description: timesheet.days[day]?.description || '',
        },
      },
    });
  };

  const handleDescriptionChange = (day: number, description: string) => {
    if (!timesheet) return;

    setTimesheet({
      ...timesheet,
      days: {
        ...timesheet.days,
        [day]: {
          type: timesheet.days[day]?.type || 'Full Day',
          description,
        },
      },
    });
  };

  const handleSave = async (submit: boolean = false) => {
    if (!timesheet || !currentUser) return;

    setLoading(true);

    try {
      const updatedTimesheet: TimesheetType = {
        ...timesheet,
        status: submit ? 'Submitted' : 'Draft',
        ...(submit && { submittedAt: serverTimestamp() as any }),
      };

      await setDoc(doc(db, 'timesheets', timesheet.id), updatedTimesheet);

      toast({
        title: submit ? 'Timesheet submitted successfully' : 'Timesheet saved as draft',
        status: 'success',
        duration: 3000,
      });

      await fetchTimesheet();
    } catch (error: any) {
      toast({
        title: 'Error saving timesheet',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const getDayName = (day: number) => {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Timesheet</Heading>
          {timesheet?.status === 'Submitted' && (
            <Badge colorScheme="green" fontSize="md" px={3} py={1}>
              Submitted
            </Badge>
          )}
        </Box>

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <HStack spacing={4}>
                <Select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  maxW="200px"
                  isDisabled={timesheet?.status === 'Submitted'}
                >
                  {months.map((m, i) => (
                    <option key={i} value={i}>
                      {m}
                    </option>
                  ))}
                </Select>

                <Select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  maxW="150px"
                  isDisabled={timesheet?.status === 'Submitted'}
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </HStack>

              <Box overflowX="auto">
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Date</Th>
                      <Th>Day</Th>
                      <Th>Type</Th>
                      <Th>Description</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                      <Tr key={day} bg={isWeekend(day) ? 'gray.50' : 'white'}>
                        <Td>{day}</Td>
                        <Td>
                          <Text fontSize="sm" color={isWeekend(day) ? 'red.500' : 'inherit'}>
                            {getDayName(day)}
                          </Text>
                        </Td>
                        <Td>
                          <Select
                            size="sm"
                            value={timesheet?.days[day]?.type || 'Full Day'}
                            onChange={(e) =>
                              handleDayTypeChange(day, e.target.value as TimesheetDayType)
                            }
                            isDisabled={timesheet?.status === 'Submitted'}
                          >
                            <option value="Full Day">Full Day</option>
                            <option value="Half Day">Half Day</option>
                            <option value="Leave">Leave</option>
                          </Select>
                        </Td>
                        <Td>
                          <Textarea
                            size="sm"
                            placeholder="What did you work on?"
                            value={timesheet?.days[day]?.description || ''}
                            onChange={(e) => handleDescriptionChange(day, e.target.value)}
                            isDisabled={timesheet?.status === 'Submitted'}
                            rows={2}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>

              {timesheet?.status !== 'Submitted' && (
                <HStack spacing={4} justify="flex-end">
                  <Button onClick={() => handleSave(false)} isLoading={loading}>
                    Save Draft
                  </Button>
                  <Button colorScheme="blue" onClick={() => handleSave(true)} isLoading={loading}>
                    Submit Timesheet
                  </Button>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Layout>
  );
};

export default Timesheet;
