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
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  Select,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Expense {
  id: string;
  employee_id: string;
  employee_name?: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_date: string;
  receipt_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  submitted_at: string;
  review_comments: string | null;
}

interface ExpenseApprovalsTabProps {
  reporteeIds: string[];
  reportees: { id: string; display_name?: string; email: string }[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved': return 'green';
    case 'Rejected': return 'red';
    default: return 'yellow';
  }
};

const ExpenseApprovalsTab: React.FC<ExpenseApprovalsTabProps> = ({ reporteeIds, reportees }) => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Expense | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('Pending');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    if (reporteeIds.length > 0) fetchExpenses();
    else setLoading(false);
  }, [reporteeIds]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .in('employee_id', reporteeIds)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Enrich with employee name
      const enriched = (data || []).map((exp) => {
        const emp = reportees.find((r) => r.id === exp.employee_id);
        return { ...exp, employee_name: emp?.display_name || emp?.email || 'Unknown' };
      });

      setExpenses(enriched);
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

  const openReview = (expense: Expense) => {
    setSelected(expense);
    setComments('');
    onOpen();
  };

  const handleDecision = async (approve: boolean) => {
    if (!selected || !currentUser) return;
    setSubmitting(true);
    try {
      const updateData: any = {
        status: approve ? 'Approved' : 'Rejected',
        reviewed_by: currentUser.id,
        reviewed_at: new Date().toISOString(),
        review_comments: comments || null,
      };

      if (approve) {
        // Assign the payslip to the current month when approving
        const expenseDate = new Date(selected.expense_date);
        updateData.payslip_month = expenseDate.getMonth();
        updateData.payslip_year = expenseDate.getFullYear();
      }

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', selected.id);

      if (error) throw error;

      toast({
        title: approve ? 'Expense approved' : 'Expense rejected',
        status: 'success',
        duration: 3000,
      });

      onClose();
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error processing expense',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const filtered = filterStatus
    ? expenses.filter((e) => e.status === filterStatus)
    : expenses;

  const pendingCount = expenses.filter((e) => e.status === 'Pending').length;

  if (loading) {
    return <Text color="gray.500">Loading expenses...</Text>;
  }

  if (reporteeIds.length === 0) {
    return <Text color="gray.500">No team members reporting to you</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between">
        <Text fontWeight="medium">
          {pendingCount > 0 && (
            <Badge colorScheme="yellow" mr={2}>{pendingCount} pending</Badge>
          )}
          Team Expenses
        </Text>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          maxW="150px"
          size="sm"
        >
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </Select>
      </HStack>

      {filtered.length === 0 ? (
        <Text color="gray.500">No {filterStatus.toLowerCase() || ''} expenses</Text>
      ) : (
        <Box overflowX="auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Employee</Th>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Date</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filtered.map((expense) => (
                <Tr key={expense.id}>
                  <Td>{expense.employee_name}</Td>
                  <Td>{expense.title}</Td>
                  <Td>{expense.category}</Td>
                  <Td>{formatDate(expense.expense_date)}</Td>
                  <Td fontWeight="semibold">{formatCurrency(expense.amount)}</Td>
                  <Td>
                    <Badge colorScheme={getStatusColor(expense.status)}>
                      {expense.status}
                    </Badge>
                  </Td>
                  <Td>
                    {expense.status === 'Pending' && (
                      <Button size="sm" onClick={() => openReview(expense)}>
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

      {/* Review Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Expense</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selected && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontSize="xs" color="gray.500">Employee</Text>
                  <Text fontWeight="medium">{selected.employee_name}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">Title</Text>
                  <Text fontWeight="medium">{selected.title}</Text>
                </Box>
                {selected.description && (
                  <Box>
                    <Text fontSize="xs" color="gray.500">Description</Text>
                    <Text>{selected.description}</Text>
                  </Box>
                )}
                <HStack spacing={6}>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Amount</Text>
                    <Text fontWeight="bold" fontSize="lg">{formatCurrency(selected.amount)}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Category</Text>
                    <Text>{selected.category}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.500">Date</Text>
                    <Text>{formatDate(selected.expense_date)}</Text>
                  </Box>
                </HStack>
                <FormControl>
                  <FormLabel fontSize="sm">Comments (optional)</FormLabel>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Add any comments..."
                    rows={3}
                    resize="none"
                  />
                </FormControl>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="red" mr={3} onClick={() => handleDecision(false)} isLoading={submitting}>
              Reject
            </Button>
            <Button colorScheme="green" onClick={() => handleDecision(true)} isLoading={submitting}>
              Approve
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default ExpenseApprovalsTab;
