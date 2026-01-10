import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
} from '@chakra-ui/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Timesheet, User } from '../../types';

const TimesheetReview: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map((doc) => doc.data() as User);
      setUsers(usersData);

      const timesheetsQuery = query(
        collection(db, 'timesheets'),
        where('month', '==', selectedMonth),
        where('year', '==', selectedYear)
      );
      const timesheetsSnapshot = await getDocs(timesheetsQuery);
      const timesheetsData = timesheetsSnapshot.docs.map((doc) => doc.data() as Timesheet);
      setTimesheets(timesheetsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const getUserName = (uid: string) => {
    const user = users.find((u) => u.uid === uid);
    return user?.displayName || user?.email || uid;
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Box display="flex" gap={4} alignItems="center">
          <Text fontSize="lg" fontWeight="bold">
            Timesheet Review
          </Text>
          <Select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            maxW="200px"
          >
            {months.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </Select>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            maxW="150px"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </Box>

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
              {timesheets.map((timesheet) => (
                <Tr key={timesheet.id}>
                  <Td>{getUserName(timesheet.employeeId)}</Td>
                  <Td>{months[timesheet.month]}</Td>
                  <Td>{timesheet.year}</Td>
                  <Td>
                    <Badge colorScheme={timesheet.status === 'Submitted' ? 'green' : 'yellow'}>
                      {timesheet.status}
                    </Badge>
                  </Td>
                  <Td>{Object.keys(timesheet.days).length} days</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {timesheets.length === 0 && (
            <Text color="gray.500" p={4} textAlign="center">
              No timesheets found for this period
            </Text>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default TimesheetReview;
