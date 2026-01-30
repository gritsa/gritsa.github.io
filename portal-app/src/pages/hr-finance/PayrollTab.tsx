import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  SimpleGrid,
  Text,
  useToast,
  Card,
  CardBody,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react';
import { AddIcon, EditIcon, ViewIcon, DeleteIcon } from '@chakra-ui/icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { SalaryStructure, Payslip } from '../../types';

interface PayrollTabProps {
  employeeId: string;
}

const PayrollTab: React.FC<PayrollTabProps> = ({ employeeId }) => {
  const { currentUser } = useAuth();
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { isOpen: isSalaryOpen, onOpen: onSalaryOpen, onClose: onSalaryClose } = useDisclosure();
  const { isOpen: isPayslipOpen, onOpen: onPayslipOpen, onClose: onPayslipClose } = useDisclosure();
  const toast = useToast();

  const [editingSalaryId, setEditingSalaryId] = useState<string | null>(null);
  const [editingPayslipId, setEditingPayslipId] = useState<string | null>(null);

  const [salaryForm, setSalaryForm] = useState({
    effective_from: '',
    basic_salary: '',
    hra: '',
    special_allowance: '',
  });

  const [payslipForm, setPayslipForm] = useState({
    gross_salary: 0,
    total_deductions: 0,
    net_salary: 0,
  });

  useEffect(() => {
    fetchSalaryStructures();
    fetchPayslips();
  }, [employeeId]);

  const fetchSalaryStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('salary_structures')
        .select('*')
        .eq('employee_id', employeeId)
        .order('effective_from', { ascending: false });

      if (error) throw error;
      setSalaryStructures(data || []);
    } catch (error: any) {
      console.error('Error fetching salary structures:', error);
    }
  };

  const fetchPayslips = async () => {
    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', employeeId)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setPayslips(data || []);
    } catch (error: any) {
      console.error('Error fetching payslips:', error);
    }
  };

  const handleEditSalary = (salary: SalaryStructure) => {
    setEditingSalaryId(salary.id);
    setSalaryForm({
      effective_from: salary.effective_from,
      basic_salary: salary.basic_salary.toString(),
      hra: salary.hra.toString(),
      special_allowance: salary.special_allowance.toString(),
    });
    onSalaryOpen();
  };

  const handleDeleteSalary = async (salaryId: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;

    try {
      const { error } = await supabase
        .from('salary_structures')
        .delete()
        .eq('id', salaryId);

      if (error) throw error;

      toast({
        title: 'Salary structure deleted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchSalaryStructures();
    } catch (error: any) {
      toast({
        title: 'Error deleting salary structure',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleSaveSalaryStructure = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      const salaryData = {
        employee_id: employeeId,
        effective_from: salaryForm.effective_from,
        basic_salary: parseFloat(salaryForm.basic_salary),
        hra: parseFloat(salaryForm.hra) || 0,
        special_allowance: parseFloat(salaryForm.special_allowance) || 0,
        other_allowances: {},
        deductions: {},
        is_active: true,
        created_by: currentUser.id,
      };

      if (editingSalaryId) {
        // Update existing salary structure
        const { error } = await supabase
          .from('salary_structures')
          .update(salaryData)
          .eq('id', editingSalaryId);

        if (error) throw error;

        toast({
          title: 'Salary structure updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        // Create new salary structure
        const { error } = await supabase
          .from('salary_structures')
          .insert([salaryData]);

        if (error) throw error;

        toast({
          title: 'Salary structure created successfully',
          status: 'success',
          duration: 3000,
        });
      }

      setSalaryForm({
        effective_from: '',
        basic_salary: '',
        hra: '',
        special_allowance: '',
      });
      setEditingSalaryId(null);

      onSalaryClose();
      fetchSalaryStructures();
    } catch (error: any) {
      toast({
        title: editingSalaryId ? 'Error updating salary structure' : 'Error creating salary structure',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslip = () => {
    // Check if payslip already exists
    const existingPayslip = payslips.find(p => p.month === selectedMonth && p.year === selectedYear);

    if (existingPayslip) {
      // Edit existing payslip
      setEditingPayslipId(existingPayslip.id);
      setPayslipForm({
        gross_salary: existingPayslip.gross_salary,
        total_deductions: existingPayslip.total_deductions,
        net_salary: existingPayslip.net_salary,
      });
      onPayslipOpen();
      return;
    }

    // Find active salary structure for the selected month
    const activeSalary = salaryStructures.find(s => {
      const effectiveDate = new Date(s.effective_from);
      const selectedDate = new Date(selectedYear, selectedMonth - 1);
      return effectiveDate <= selectedDate && s.is_active;
    });

    if (!activeSalary) {
      toast({
        title: 'No salary structure found',
        description: 'Please create a salary structure first',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    // Calculate gross salary
    const gross = activeSalary.basic_salary + activeSalary.hra + activeSalary.special_allowance;

    setEditingPayslipId(null);
    setPayslipForm({
      gross_salary: gross,
      total_deductions: 0,
      net_salary: gross,
    });

    onPayslipOpen();
  };

  const handleEditPayslip = (payslip: Payslip) => {
    setEditingPayslipId(payslip.id);
    setSelectedMonth(payslip.month);
    setSelectedYear(payslip.year);
    setPayslipForm({
      gross_salary: payslip.gross_salary,
      total_deductions: payslip.total_deductions,
      net_salary: payslip.net_salary,
    });
    onPayslipOpen();
  };

  const handleSavePayslip = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      const payslipData = {
        employee_id: employeeId,
        month: selectedMonth,
        year: selectedYear,
        gross_salary: payslipForm.gross_salary,
        total_deductions: payslipForm.total_deductions,
        net_salary: payslipForm.gross_salary - payslipForm.total_deductions,
        details: {},
        status: 'Draft',
      };

      const { error } = await supabase
        .from('payslips')
        .upsert(payslipData, { onConflict: 'employee_id,month,year' });

      if (error) throw error;

      toast({
        title: 'Payslip saved successfully',
        status: 'success',
        duration: 3000,
      });

      setEditingPayslipId(null);
      onPayslipClose();
      fetchPayslips();
    } catch (error: any) {
      toast({
        title: 'Error saving payslip',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayslip = async (payslipId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('payslips')
        .update({
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: currentUser.id,
        })
        .eq('id', payslipId);

      if (error) throw error;

      toast({
        title: 'Payslip submitted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchPayslips();
    } catch (error: any) {
      toast({
        title: 'Error submitting payslip',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Salary Structures */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" mb={4}>
            <Heading size="sm" color="white">Salary Structures</Heading>
            <Button
              leftIcon={<AddIcon />}
              size="sm"
              variant="gradient"
              onClick={onSalaryOpen}
            >
              Add Structure
            </Button>
          </HStack>

          {salaryStructures.length === 0 ? (
            <Text color="whiteAlpha.700">No salary structures configured</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th color="whiteAlpha.700">Effective From</Th>
                  <Th color="whiteAlpha.700">Basic</Th>
                  <Th color="whiteAlpha.700">HRA</Th>
                  <Th color="whiteAlpha.700">Special</Th>
                  <Th color="whiteAlpha.700">Total</Th>
                  <Th color="whiteAlpha.700">Status</Th>
                  <Th color="whiteAlpha.700">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {salaryStructures.map((salary) => (
                  <Tr key={salary.id}>
                    <Td color="white">{new Date(salary.effective_from).toLocaleDateString()}</Td>
                    <Td color="white">₹{salary.basic_salary.toFixed(2)}</Td>
                    <Td color="white">₹{salary.hra.toFixed(2)}</Td>
                    <Td color="white">₹{salary.special_allowance.toFixed(2)}</Td>
                    <Td color="white">₹{(salary.basic_salary + salary.hra + salary.special_allowance).toFixed(2)}</Td>
                    <Td>
                      <Badge colorScheme={salary.is_active ? 'green' : 'gray'}>
                        {salary.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Edit salary structure"
                          icon={<EditIcon />}
                          size="xs"
                          variant="ghost"
                          color="blue.400"
                          onClick={() => handleEditSalary(salary)}
                        />
                        <IconButton
                          aria-label="Delete salary structure"
                          icon={<DeleteIcon />}
                          size="xs"
                          variant="ghost"
                          color="red.400"
                          onClick={() => handleDeleteSalary(salary.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Payslips */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" mb={4}>
            <Heading size="sm" color="white">Payslips</Heading>
            <HStack>
              <Select
                size="sm"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                maxW="120px"
                variant="filled"
                color="white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                maxW="100px"
                variant="filled"
                color="white"
              >
                {[2024, 2025, 2026, 2027].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="gradient"
                onClick={handleGeneratePayslip}
              >
                Generate Payslip
              </Button>
            </HStack>
          </HStack>

          {payslips.length === 0 ? (
            <Text color="whiteAlpha.700">No payslips generated yet</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th color="whiteAlpha.700">Month</Th>
                  <Th color="whiteAlpha.700">Year</Th>
                  <Th color="whiteAlpha.700">Gross</Th>
                  <Th color="whiteAlpha.700">Deductions</Th>
                  <Th color="whiteAlpha.700">Net</Th>
                  <Th color="whiteAlpha.700">Status</Th>
                  <Th color="whiteAlpha.700">Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {payslips.map((payslip) => (
                  <Tr key={payslip.id}>
                    <Td color="white">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][payslip.month - 1]}</Td>
                    <Td color="white">{payslip.year}</Td>
                    <Td color="white">₹{payslip.gross_salary.toFixed(2)}</Td>
                    <Td color="white">₹{payslip.total_deductions.toFixed(2)}</Td>
                    <Td color="white">₹{payslip.net_salary.toFixed(2)}</Td>
                    <Td>
                      <Badge colorScheme={payslip.status === 'Paid' ? 'green' : payslip.status === 'Submitted' ? 'blue' : 'yellow'}>
                        {payslip.status}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Edit payslip"
                          icon={<EditIcon />}
                          size="xs"
                          variant="ghost"
                          color="blue.400"
                          onClick={() => handleEditPayslip(payslip)}
                        />
                        {payslip.status === 'Draft' && (
                          <Button
                            size="xs"
                            colorScheme="blue"
                            onClick={() => handleSubmitPayslip(payslip.id)}
                          >
                            Submit
                          </Button>
                        )}
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Salary Structure Modal */}
      <Modal isOpen={isSalaryOpen} onClose={onSalaryClose}>
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="rgba(255, 255, 255, 0.1)">
          <ModalHeader color="white">{editingSalaryId ? 'Edit' : 'Add'} Salary Structure</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Effective From</FormLabel>
                <Input
                  variant="filled"
                  type="date"
                  value={salaryForm.effective_from}
                  onChange={(e) => setSalaryForm({ ...salaryForm, effective_from: e.target.value })}
                  color="white"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Basic Salary (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={salaryForm.basic_salary}
                  onChange={(e) => setSalaryForm({ ...salaryForm, basic_salary: e.target.value })}
                  color="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">HRA (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={salaryForm.hra}
                  onChange={(e) => setSalaryForm({ ...salaryForm, hra: e.target.value })}
                  color="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Special Allowance (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={salaryForm.special_allowance}
                  onChange={(e) => setSalaryForm({ ...salaryForm, special_allowance: e.target.value })}
                  color="white"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onSalaryClose} color="whiteAlpha.900">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSaveSalaryStructure} isLoading={loading}>
              {editingSalaryId ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Payslip Modal */}
      <Modal isOpen={isPayslipOpen} onClose={onPayslipClose}>
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="rgba(255, 255, 255, 0.1)">
          <ModalHeader color="white">
            Payslip for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="whiteAlpha.900">Gross Salary (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={payslipForm.gross_salary}
                  onChange={(e) => setPayslipForm({
                    ...payslipForm,
                    gross_salary: parseFloat(e.target.value) || 0,
                  })}
                  color="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Total Deductions (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={payslipForm.total_deductions}
                  onChange={(e) => setPayslipForm({
                    ...payslipForm,
                    total_deductions: parseFloat(e.target.value) || 0,
                  })}
                  color="white"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Net Salary (₹)</FormLabel>
                <Input
                  variant="filled"
                  type="number"
                  value={(payslipForm.gross_salary - payslipForm.total_deductions).toFixed(2)}
                  isReadOnly
                  color="white"
                  bg="rgba(255, 255, 255, 0.05)"
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onPayslipClose} color="whiteAlpha.900">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSavePayslip} isLoading={loading}>
              Save Draft
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default PayrollTab;
