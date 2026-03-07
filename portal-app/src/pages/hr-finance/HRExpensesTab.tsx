import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  useToast,
  Card,
  CardBody,
  Heading,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';

interface HRExpensesTabProps {
  employeeId: string;
}

interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  payslip_month: number | null;
  payslip_year: number | null;
  submitted_at: string;
  review_comments: string | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved': return 'green';
    case 'Rejected': return 'red';
    default: return 'yellow';
  }
};

const HRExpensesTab: React.FC<HRExpensesTabProps> = ({ employeeId }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const toast = useToast();

  useEffect(() => {
    fetchExpenses();
  }, [employeeId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', employeeId)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error fetching expenses',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const availableYears = [...new Set(
    expenses.map((e) => new Date(e.expense_date).getFullYear()),
  )].sort((a, b) => b - a);

  const filtered = expenses.filter((e) => {
    if (filterStatus && e.status !== filterStatus) return false;
    if (filterYear && String(new Date(e.expense_date).getFullYear()) !== filterYear) return false;
    return true;
  });

  const totalApproved = filtered
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Text color="whiteAlpha.700">Loading expenses...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" mb={4} flexWrap="wrap" gap={3}>
            <Heading size="sm" color="white">Expenses</Heading>
            <HStack spacing={3}>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                size="sm"
                maxW="140px"
                color="white"
                variant="filled"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </Select>
              <Select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                size="sm"
                maxW="110px"
                color="white"
                variant="filled"
              >
                <option value="">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </Select>
            </HStack>
          </HStack>

          {filtered.length > 0 && (filterStatus === '' || filterStatus === 'Approved') && (
            <Box mb={4} p={3} bg="rgba(72,187,120,0.1)" borderRadius="md" borderLeft="3px solid" borderLeftColor="green.400">
              <Text fontSize="sm" color="green.300">
                Total approved: <strong>{formatCurrency(totalApproved)}</strong>
              </Text>
            </Box>
          )}

          {filtered.length === 0 ? (
            <VStack py={8} spacing={2}>
              <Text color="whiteAlpha.700" fontSize="lg">No expenses found</Text>
              <Text color="whiteAlpha.500" fontSize="sm">
                {filterStatus || filterYear
                  ? 'Try adjusting your filters'
                  : 'This employee has not submitted any expenses yet'}
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.700">Title</Th>
                    <Th color="whiteAlpha.700">Category</Th>
                    <Th color="whiteAlpha.700">Date</Th>
                    <Th color="whiteAlpha.700">Amount</Th>
                    <Th color="whiteAlpha.700">Status</Th>
                    <Th color="whiteAlpha.700">Payslip</Th>
                    <Th color="whiteAlpha.700">Comments</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filtered.map((expense) => (
                    <Tr key={expense.id}>
                      <Td color="white" fontWeight="medium">{expense.title}</Td>
                      <Td color="whiteAlpha.800">{expense.category}</Td>
                      <Td color="whiteAlpha.700">{formatDate(expense.expense_date)}</Td>
                      <Td color="whiteAlpha.900" fontWeight="semibold">{formatCurrency(expense.amount)}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(expense.status)}>
                          {expense.status}
                        </Badge>
                      </Td>
                      <Td color="whiteAlpha.600" fontSize="xs">
                        {expense.payslip_month != null && expense.payslip_year
                          ? `${MONTHS[expense.payslip_month]} ${expense.payslip_year}`
                          : '—'}
                      </Td>
                      <Td color="whiteAlpha.600" fontSize="xs" maxW="160px">
                        <Text noOfLines={2}>{expense.review_comments || '—'}</Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

export default HRExpensesTab;
