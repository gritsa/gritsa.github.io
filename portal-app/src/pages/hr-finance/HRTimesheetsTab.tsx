import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Text,
  useToast,
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
  HStack,
  Select,
  useDisclosure,
} from '@chakra-ui/react';
import { ViewIcon } from '@chakra-ui/icons';
import { supabase } from '../../config/supabase';
import TimesheetDetailModal from '../../components/TimesheetDetailModal';

interface HRTimesheetsTabProps {
  employeeId: string;
  employeeName: string;
}

interface Timesheet {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  days: Record<number, { type: 'Full Day' | 'Half Day' | 'Leave'; description: string }>;
  status: 'Draft' | 'Submitted';
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HRTimesheetsTab: React.FC<HRTimesheetsTabProps> = ({ employeeId, employeeName }) => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    fetchTimesheets();
  }, [employeeId]);

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('employee_id', employeeId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      setTimesheets(data || []);
    } catch (error: any) {
      console.error('Error fetching timesheets:', error);
      toast({
        title: 'Error fetching timesheets',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewTimesheet = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    onOpen();
  };

  const availableYears = [...new Set(timesheets.map((t) => t.year))].sort((a, b) => b - a);

  const filteredTimesheets = timesheets.filter(
    (t) => !filterYear || String(t.year) === filterYear,
  );

  if (loading) {
    return (
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Text color="whiteAlpha.700">Loading timesheets...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" mb={4}>
            <Text fontWeight="semibold" color="white" fontSize="sm">
              Timesheets
            </Text>
            <Select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              maxW="120px"
              size="sm"
              color="white"
              variant="filled"
            >
              <option value="">All Years</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
              {!availableYears.includes(new Date().getFullYear()) && (
                <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
              )}
            </Select>
          </HStack>

          {filteredTimesheets.length === 0 ? (
            <VStack spacing={2} py={8}>
              <Text color="whiteAlpha.700" fontSize="lg">No timesheets found</Text>
              <Text color="whiteAlpha.500" fontSize="sm">
                {filterYear
                  ? `No timesheets for ${filterYear}`
                  : 'This employee has no timesheets yet'}
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.700">Month</Th>
                    <Th color="whiteAlpha.700">Year</Th>
                    <Th color="whiteAlpha.700">Status</Th>
                    <Th color="whiteAlpha.700">Days Filled</Th>
                    <Th color="whiteAlpha.700">Working Days</Th>
                    <Th color="whiteAlpha.700">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredTimesheets.map((timesheet) => {
                    const fullDays = Object.values(timesheet.days).filter((d) => d.type === 'Full Day').length;
                    const halfDays = Object.values(timesheet.days).filter((d) => d.type === 'Half Day').length;
                    const totalWorked = fullDays + halfDays * 0.5;
                    return (
                      <Tr key={timesheet.id}>
                        <Td color="white">{MONTHS[timesheet.month]}</Td>
                        <Td color="whiteAlpha.800">{timesheet.year}</Td>
                        <Td>
                          <Badge colorScheme={timesheet.status === 'Submitted' ? 'green' : 'yellow'}>
                            {timesheet.status}
                          </Badge>
                        </Td>
                        <Td color="whiteAlpha.800">{Object.keys(timesheet.days).length} days</Td>
                        <Td color="whiteAlpha.800">{totalWorked} days</Td>
                        <Td>
                          <Button
                            size="sm"
                            leftIcon={<ViewIcon />}
                            variant="outline"
                            colorScheme="brand"
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
        </CardBody>
      </Card>

      <TimesheetDetailModal
        isOpen={isOpen}
        onClose={onClose}
        timesheet={selectedTimesheet}
        employeeName={employeeName}
      />
    </VStack>
  );
};

export default HRTimesheetsTab;
