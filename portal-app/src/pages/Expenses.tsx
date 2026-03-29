import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Button,
  useToast,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  IconButton,
  NumberInput,
  NumberInputField,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { sendNotification, getUserInfo } from '../utils/notifications';

interface Expense {
  id: string;
  employee_id: string;
  title: string;
  description: string | null;
  amount: number;
  category: string;
  expense_date: string;
  receipt_url: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  payslip_month: number | null;
  payslip_year: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  review_comments: string | null;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Accommodation',
  'Food & Meals',
  'Equipment',
  'Software & Subscriptions',
  'Communication',
  'Training & Education',
  'Other',
];

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

const Expenses: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    amount: '',
    category: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, [currentUser]);

  const fetchExpenses = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('employee_id', currentUser.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
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

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!form.title || !form.amount || !form.category || !form.expense_date) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const amountNum = parseFloat(form.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Amount must be a positive number',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setSubmitting(true);
    try {
      let receiptPath: string | null = null;

      if (receiptFile) {
        const timestamp = Date.now();
        const ext = receiptFile.name.split('.').pop();
        const fileName = `${currentUser.id}/${timestamp}_receipt.${ext}`;
        const filePath = `expense-receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;
        receiptPath = filePath;
      }

      const { error } = await supabase.from('expenses').insert({
        employee_id: currentUser.id,
        title: form.title,
        description: form.description || null,
        amount: amountNum,
        category: form.category,
        expense_date: form.expense_date,
        receipt_url: receiptPath,
      });

      if (error) throw error;

      // Notify manager (non-blocking)
      if (userData?.managerId) {
        getUserInfo(userData.managerId).then((mgr) => {
          if (!mgr) return;
          sendNotification({
            type: 'expense_submitted',
            to_email: mgr.email,
            to_name: mgr.name,
            data: {
              employee_name: userData.displayName || userData.email || '',
              title: form.title,
              category: form.category,
              expense_date: new Date(form.expense_date).toLocaleDateString('en-IN'),
              amount: amountNum,
              description: form.description || '',
            },
          });
        });
      }

      toast({
        title: 'Expense submitted',
        description: 'Your expense has been submitted for approval',
        status: 'success',
        duration: 3000,
      });

      setForm({
        title: '',
        description: '',
        amount: '',
        category: '',
        expense_date: new Date().toISOString().split('T')[0],
      });
      setReceiptFile(null);
      onClose();
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error submitting expense',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Delete expense "${expense.title}"?`)) return;
    try {
      if (expense.receipt_url) {
        await supabase.storage.from('documents').remove([expense.receipt_url]);
      }
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
      if (error) throw error;
      toast({ title: 'Expense deleted', status: 'success', duration: 3000 });
      fetchExpenses();
    } catch (error: any) {
      toast({
        title: 'Error deleting expense',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const totalPending = expenses
    .filter((e) => e.status === 'Pending')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalApproved = expenses
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Heading size="lg" color="white">My Expenses</Heading>
          <Button
            leftIcon={<AddIcon />}
            variant="gradient"
            onClick={onOpen}
          >
            Submit Expense
          </Button>
        </HStack>

        {/* Summary Cards */}
        <HStack spacing={4} flexWrap="wrap">
          <Card bg="rgba(255,255,255,0.05)" borderColor="rgba(255,255,255,0.1)" flex={1} minW="160px">
            <CardBody>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Pending</Text>
              <Text fontSize="xl" fontWeight="bold" color="yellow.300">{formatCurrency(totalPending)}</Text>
              <Text fontSize="xs" color="whiteAlpha.500">{expenses.filter((e) => e.status === 'Pending').length} expense(s)</Text>
            </CardBody>
          </Card>
          <Card bg="rgba(255,255,255,0.05)" borderColor="rgba(255,255,255,0.1)" flex={1} minW="160px">
            <CardBody>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Approved</Text>
              <Text fontSize="xl" fontWeight="bold" color="green.300">{formatCurrency(totalApproved)}</Text>
              <Text fontSize="xs" color="whiteAlpha.500">{expenses.filter((e) => e.status === 'Approved').length} expense(s)</Text>
            </CardBody>
          </Card>
        </HStack>

        {/* Expenses Table */}
        <Card bg="rgba(255,255,255,0.05)" borderColor="rgba(255,255,255,0.1)">
          <CardBody>
            {loading ? (
              <Text color="whiteAlpha.700">Loading expenses...</Text>
            ) : expenses.length === 0 ? (
              <VStack py={8} spacing={2}>
                <Text color="whiteAlpha.700" fontSize="lg">No expenses submitted yet</Text>
                <Text color="whiteAlpha.500" fontSize="sm">
                  Click "Submit Expense" to add your first expense claim
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
                      <Th color="whiteAlpha.700"></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {expenses.map((expense) => (
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
                        <Td color="whiteAlpha.600" fontSize="xs" maxW="200px">
                          <Text noOfLines={2}>{expense.review_comments || '—'}</Text>
                        </Td>
                        <Td>
                          {expense.status === 'Pending' && (
                            <IconButton
                              aria-label="Delete expense"
                              icon={<DeleteIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(expense)}
                            />
                          )}
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

      {/* Submit Expense Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="rgba(255,255,255,0.1)">
          <ModalHeader color="white">Submit Expense</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Title</FormLabel>
                <Input
                  variant="filled"
                  placeholder="e.g., Client dinner, Flight to Mumbai"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  color="white"
                />
              </FormControl>

              <HStack w="full" spacing={4}>
                <FormControl isRequired flex={1}>
                  <FormLabel color="whiteAlpha.900">Amount (₹)</FormLabel>
                  <NumberInput min={0.01}>
                    <NumberInputField
                      placeholder="0.00"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      color="white"
                    />
                  </NumberInput>
                </FormControl>

                <FormControl isRequired flex={1}>
                  <FormLabel color="whiteAlpha.900">Date</FormLabel>
                  <Input
                    variant="filled"
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    color="white"
                  />
                </FormControl>
              </HStack>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Category</FormLabel>
                <Select
                  variant="filled"
                  placeholder="Select category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  color="white"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Description</FormLabel>
                <Textarea
                  variant="filled"
                  placeholder="Additional details about this expense..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  color="white"
                  rows={3}
                  resize="none"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Receipt (optional)</FormLabel>
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  color="white"
                  variant="filled"
                  pt={1}
                />
                <Text fontSize="xs" color="whiteAlpha.500" mt={1}>
                  Supported: Images, PDF
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color="white">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} isLoading={submitting}>
              Submit Expense
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default Expenses;
