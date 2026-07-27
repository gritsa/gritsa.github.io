import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Text,
  Button,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  Switch,
  Badge,
  IconButton,
  Tooltip,
  List,
  ListItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  CheckboxGroup,
  Checkbox,
  Stack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, ArrowUpIcon, ArrowDownIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import { sendNotification } from '../../utils/notifications';
import PolicyEditorModal from '../../components/PolicyEditorModal';
import PolicySigningModal from '../../components/PolicySigningModal';
import type { PolicySet, Policy, PolicyAssignment } from '../../types';

interface Employee {
  id: string;
  email: string;
  display_name?: string;
  role: string;
}

interface AssignmentRow extends PolicyAssignment {
  total_policies: number;
  signed_count: number;
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(row: AssignmentRow): boolean {
  return row.status !== 'Completed' && !!row.due_date && new Date(row.due_date) < new Date();
}

const PoliciesManagement: React.FC = () => {
  const { userData, currentUser } = useAuth();
  const toast = useToast();

  const isHRFinance = userData?.role === 'HR-Finance' || userData?.role === 'Administrator';

  // ── Policy Sets tab state ──────────────────────────────────────────────
  const [policySets, setPolicySets] = useState<PolicySet[]>([]);
  const [selectedSet, setSelectedSet] = useState<PolicySet | null>(null);
  const [setPolicies, setSetPolicies] = useState<Policy[]>([]);
  const [assignmentCountForSet, setAssignmentCountForSet] = useState(0);
  const [signedPolicyIds, setSignedPolicyIds] = useState<Set<string>>(new Set());
  const [newSetForm, setNewSetForm] = useState({ name: '', description: '' });
  const [savingSet, setSavingSet] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const newSetModal = useDisclosure();
  const policyEditorModal = useDisclosure();

  // ── Assign & Track tab state ───────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignSetId, setAssignSetId] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [viewAssignment, setViewAssignment] = useState<AssignmentRow | null>(null);
  const viewModal = useDisclosure();

  useEffect(() => {
    if (!isHRFinance) return;
    fetchPolicySets();
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHRFinance]);

  useEffect(() => {
    if (selectedSet) fetchSetDetail(selectedSet.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSet?.id]);

  useEffect(() => {
    if (assignSetId) fetchAssignmentsForSet(assignSetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignSetId]);

  const fetchPolicySets = async () => {
    try {
      const { data, error } = await supabase.from('policy_sets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPolicySets(data || []);
      if (data && data.length > 0 && !selectedSet) {
        setSelectedSet(data[0]);
      }
    } catch (error: any) {
      toast({ title: 'Error fetching policy sets', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase.from('users').select('id, email, display_name, role').order('display_name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({ title: 'Error fetching employees', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const fetchSetDetail = async (policySetId: string) => {
    try {
      const [{ data: policyRows, error: policyError }, { count: assignmentCount, error: assignmentError }] = await Promise.all([
        supabase.from('policies').select('*').eq('policy_set_id', policySetId).order('order_index'),
        supabase.from('policy_assignments').select('id', { count: 'exact', head: true }).eq('policy_set_id', policySetId),
      ]);
      if (policyError) throw policyError;
      if (assignmentError) throw assignmentError;

      const policies = policyRows || [];
      setSetPolicies(policies);
      setAssignmentCountForSet(assignmentCount || 0);

      if (policies.length > 0) {
        const { data: sigRows, error: sigError } = await supabase
          .from('policy_signatures')
          .select('policy_id')
          .in('policy_id', policies.map((p) => p.id));
        if (sigError) throw sigError;
        setSignedPolicyIds(new Set((sigRows || []).map((r) => r.policy_id)));
      } else {
        setSignedPolicyIds(new Set());
      }
    } catch (error: any) {
      toast({ title: 'Error fetching policy set detail', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const fetchAssignmentsForSet = async (policySetId: string) => {
    setLoadingAssignments(true);
    try {
      const { count: totalPoliciesCount } = await supabase
        .from('policies')
        .select('id', { count: 'exact', head: true })
        .eq('policy_set_id', policySetId);
      const totalPolicies = totalPoliciesCount || 0;

      const { data: rows, error } = await supabase
        .from('policy_assignments')
        .select('*')
        .eq('policy_set_id', policySetId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;

      const withCounts = await Promise.all(
        (rows || []).map(async (row) => {
          const { count: signedCount } = await supabase
            .from('policy_signatures')
            .select('id', { count: 'exact', head: true })
            .eq('assignment_id', row.id);
          return { ...row, total_policies: totalPolicies, signed_count: signedCount || 0 };
        })
      );

      setAssignments(withCounts);
    } catch (error: any) {
      toast({ title: 'Error fetching assignments', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setLoadingAssignments(false);
    }
  };

  // ── Policy Sets tab actions ─────────────────────────────────────────────

  const handleCreateSet = async () => {
    if (!newSetForm.name.trim() || !currentUser) return;
    setSavingSet(true);
    try {
      const { data, error } = await supabase
        .from('policy_sets')
        .insert({ name: newSetForm.name.trim(), description: newSetForm.description.trim() || null, created_by: currentUser.id })
        .select()
        .single();
      if (error) throw error;

      toast({ title: 'Policy set created', status: 'success', duration: 3000 });
      setNewSetForm({ name: '', description: '' });
      newSetModal.onClose();
      await fetchPolicySets();
      setSelectedSet(data);
    } catch (error: any) {
      toast({ title: 'Error creating policy set', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setSavingSet(false);
    }
  };

  const handleToggleActive = async (set: PolicySet) => {
    try {
      const { error } = await supabase.from('policy_sets').update({ is_active: !set.is_active }).eq('id', set.id);
      if (error) throw error;
      await fetchPolicySets();
      if (selectedSet?.id === set.id) setSelectedSet({ ...set, is_active: !set.is_active });
    } catch (error: any) {
      toast({ title: 'Error updating policy set', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const handleDeleteSet = async (set: PolicySet) => {
    if (assignmentCountForSet > 0) return;
    if (!confirm(`Delete "${set.name}" and all its policies? This cannot be undone.`)) return;
    try {
      const { error } = await supabase.from('policy_sets').delete().eq('id', set.id);
      if (error) throw error;
      toast({ title: 'Policy set deleted', status: 'success', duration: 3000 });
      setSelectedSet(null);
      await fetchPolicySets();
    } catch (error: any) {
      toast({ title: 'Error deleting policy set', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const handleMovePolicy = async (policy: Policy, direction: 'up' | 'down') => {
    const idx = setPolicies.findIndex((p) => p.id === policy.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= setPolicies.length) return;
    const other = setPolicies[swapIdx];
    try {
      await Promise.all([
        supabase.from('policies').update({ order_index: other.order_index }).eq('id', policy.id),
        supabase.from('policies').update({ order_index: policy.order_index }).eq('id', other.id),
      ]);
      if (selectedSet) await fetchSetDetail(selectedSet.id);
    } catch (error: any) {
      toast({ title: 'Error reordering policies', description: error.message, status: 'error', duration: 5000 });
    }
  };

  const openNewPolicy = () => {
    setEditingPolicy(null);
    setIsCreatingPolicy(true);
    policyEditorModal.onOpen();
  };

  const openEditPolicy = (policy: Policy) => {
    setEditingPolicy(policy);
    setIsCreatingPolicy(false);
    policyEditorModal.onOpen();
  };

  const handleSavePolicy = async (title: string, content: string) => {
    if (!selectedSet || !currentUser) return;
    setSavingPolicy(true);
    try {
      if (isCreatingPolicy) {
        const nextOrder = setPolicies.length > 0 ? Math.max(...setPolicies.map((p) => p.order_index)) + 1 : 0;
        const { error } = await supabase.from('policies').insert({
          policy_set_id: selectedSet.id,
          title,
          content,
          order_index: nextOrder,
          created_by: currentUser.id,
        });
        if (error) throw error;
      } else if (editingPolicy) {
        const { error } = await supabase.from('policies').update({ title, content }).eq('id', editingPolicy.id);
        if (error) throw error;
      }

      toast({ title: 'Policy saved', status: 'success', duration: 3000 });
      policyEditorModal.onClose();
      await fetchSetDetail(selectedSet.id);
    } catch (error: any) {
      toast({ title: 'Error saving policy', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async (policy: Policy) => {
    if (signedPolicyIds.has(policy.id)) return;
    if (!confirm(`Delete "${policy.title}"?`)) return;
    try {
      const { error } = await supabase.from('policies').delete().eq('id', policy.id);
      if (error) throw error;
      toast({ title: 'Policy deleted', status: 'success', duration: 3000 });
      if (selectedSet) await fetchSetDetail(selectedSet.id);
    } catch (error: any) {
      toast({ title: 'Error deleting policy', description: error.message, status: 'error', duration: 5000 });
    }
  };

  // ── Assign & Track tab actions ──────────────────────────────────────────

  const handleAssign = async () => {
    if (!assignSetId || selectedEmployeeIds.length === 0 || !currentUser) return;
    setAssigning(true);
    try {
      const set = policySets.find((s) => s.id === assignSetId);
      const rows = selectedEmployeeIds.map((employeeId) => ({
        policy_set_id: assignSetId,
        employee_id: employeeId,
        assigned_by: currentUser.id,
        due_date: dueDate || null,
      }));
      const { error } = await supabase.from('policy_assignments').insert(rows);
      if (error) throw error;

      toast({ title: `Assigned to ${selectedEmployeeIds.length} employee(s)`, status: 'success', duration: 3000 });

      selectedEmployeeIds.forEach((employeeId) => {
        const employee = employees.find((e) => e.id === employeeId);
        if (!employee) return;
        sendNotification({
          type: 'policy_set_assigned',
          to_email: employee.email,
          to_name: employee.display_name || employee.email,
          data: {
            policy_set_name: set?.name || 'Policy Set',
            due_date: dueDate ? formatDate(dueDate) : 'No due date',
          },
        });
      });

      setSelectedEmployeeIds([]);
      await fetchAssignmentsForSet(assignSetId);
    } catch (error: any) {
      toast({ title: 'Error assigning policy set', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setAssigning(false);
    }
  };

  const openView = (row: AssignmentRow) => {
    setViewAssignment(row);
    viewModal.onOpen();
  };

  if (!isHRFinance) {
    return (
      <Layout>
        <Card bg="rgba(255, 255, 255, 0.05)">
          <CardBody>
            <Text color="white">You do not have permission to access this page.</Text>
          </CardBody>
        </Card>
      </Layout>
    );
  }

  const setLocked = assignmentCountForSet > 0;
  const activeSets = policySets.filter((s) => s.is_active);
  const employeeById = (id: string) => employees.find((e) => e.id === id);

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="white">
          Manage Policies
        </Heading>

        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
              Policy Sets
            </Tab>
            <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
              Assign &amp; Track
            </Tab>
          </TabList>

          <TabPanels>
            {/* ── Policy Sets ─────────────────────────────────────────── */}
            <TabPanel px={0}>
              <HStack align="stretch" spacing={6}>
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)" w="300px" h="calc(100vh - 300px)" overflowY="auto">
                  <CardBody>
                    <HStack justify="space-between" mb={4}>
                      <Heading size="sm" color="white">
                        Sets
                      </Heading>
                      <IconButton aria-label="New policy set" icon={<AddIcon />} size="sm" onClick={newSetModal.onOpen} />
                    </HStack>
                    <List spacing={2}>
                      {policySets.map((set) => (
                        <ListItem
                          key={set.id}
                          p={3}
                          borderRadius="md"
                          bg={selectedSet?.id === set.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}
                          cursor="pointer"
                          _hover={{ bg: 'rgba(255, 255, 255, 0.05)' }}
                          onClick={() => setSelectedSet(set)}
                        >
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="white" noOfLines={1}>
                              {set.name}
                            </Text>
                            {!set.is_active && (
                              <Badge colorScheme="gray" fontSize="0.6em">
                                Inactive
                              </Badge>
                            )}
                          </HStack>
                        </ListItem>
                      ))}
                    </List>
                  </CardBody>
                </Card>

                <Box flex={1}>
                  {selectedSet ? (
                    <VStack align="stretch" spacing={4}>
                      <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                        <CardBody>
                          <HStack justify="space-between" align="start" flexWrap="wrap">
                            <VStack align="start" spacing={1}>
                              <Text fontSize="lg" fontWeight="bold" color="white">
                                {selectedSet.name}
                              </Text>
                              {selectedSet.description && (
                                <Text fontSize="sm" color="whiteAlpha.700">
                                  {selectedSet.description}
                                </Text>
                              )}
                            </VStack>
                            <HStack>
                              <HStack>
                                <Text fontSize="sm" color="whiteAlpha.700">
                                  Active
                                </Text>
                                <Switch isChecked={selectedSet.is_active} onChange={() => handleToggleActive(selectedSet)} />
                              </HStack>
                              <Tooltip
                                label={setLocked ? 'Cannot delete a set that has been assigned' : ''}
                                isDisabled={!setLocked}
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  colorScheme="red"
                                  isDisabled={setLocked}
                                  onClick={() => handleDeleteSet(selectedSet)}
                                >
                                  Delete Set
                                </Button>
                              </Tooltip>
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>

                      <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                        <CardBody>
                          <HStack justify="space-between" mb={4}>
                            <Heading size="sm" color="white">
                              Policies
                            </Heading>
                            <Tooltip
                              label={setLocked ? 'This set has already been assigned — create a new set to add more policies' : ''}
                              isDisabled={!setLocked}
                            >
                              <Button leftIcon={<AddIcon />} size="sm" variant="gradient" isDisabled={setLocked} onClick={openNewPolicy}>
                                New Policy
                              </Button>
                            </Tooltip>
                          </HStack>

                          {setPolicies.length === 0 ? (
                            <Text color="whiteAlpha.700" fontSize="sm">
                              No policies in this set yet.
                            </Text>
                          ) : (
                            <VStack align="stretch" spacing={2}>
                              {setPolicies.map((policy, idx) => {
                                const signed = signedPolicyIds.has(policy.id);
                                return (
                                  <HStack
                                    key={policy.id}
                                    justify="space-between"
                                    p={3}
                                    bg="rgba(255, 255, 255, 0.03)"
                                    borderRadius="md"
                                  >
                                    <Text color="white" fontSize="sm">
                                      {policy.title}
                                    </Text>
                                    <HStack>
                                      <IconButton
                                        aria-label="Move up"
                                        icon={<ArrowUpIcon />}
                                        size="xs"
                                        variant="ghost"
                                        isDisabled={idx === 0}
                                        onClick={() => handleMovePolicy(policy, 'up')}
                                      />
                                      <IconButton
                                        aria-label="Move down"
                                        icon={<ArrowDownIcon />}
                                        size="xs"
                                        variant="ghost"
                                        isDisabled={idx === setPolicies.length - 1}
                                        onClick={() => handleMovePolicy(policy, 'down')}
                                      />
                                      <Tooltip label={signed ? 'This policy has been signed and can no longer be edited' : ''} isDisabled={!signed}>
                                        <IconButton
                                          aria-label="Edit policy"
                                          icon={<EditIcon />}
                                          size="xs"
                                          variant="ghost"
                                          isDisabled={signed}
                                          onClick={() => openEditPolicy(policy)}
                                        />
                                      </Tooltip>
                                      <Tooltip label={signed ? 'This policy has been signed and can no longer be deleted' : ''} isDisabled={!signed}>
                                        <IconButton
                                          aria-label="Delete policy"
                                          icon={<DeleteIcon />}
                                          size="xs"
                                          variant="ghost"
                                          colorScheme="red"
                                          isDisabled={signed}
                                          onClick={() => handleDeletePolicy(policy)}
                                        />
                                      </Tooltip>
                                    </HStack>
                                  </HStack>
                                );
                              })}
                            </VStack>
                          )}
                        </CardBody>
                      </Card>
                    </VStack>
                  ) : (
                    <Card bg="rgba(255, 255, 255, 0.05)">
                      <CardBody>
                        <Text color="whiteAlpha.700">Select or create a policy set to get started.</Text>
                      </CardBody>
                    </Card>
                  )}
                </Box>
              </HStack>
            </TabPanel>

            {/* ── Assign & Track ──────────────────────────────────────── */}
            <TabPanel px={0}>
              <VStack align="stretch" spacing={6}>
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="sm" color="white" mb={4}>
                      Assign a Policy Set
                    </Heading>
                    <VStack align="stretch" spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="whiteAlpha.900">Policy Set</FormLabel>
                        <Select
                          placeholder="Select a policy set"
                          variant="filled"
                          color="white"
                          value={assignSetId}
                          onChange={(e) => setAssignSetId(e.target.value)}
                        >
                          {activeSets.map((set) => (
                            <option key={set.id} value={set.id} style={{ color: 'black' }}>
                              {set.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel color="whiteAlpha.900">Assign to Employees</FormLabel>
                        <Box maxH="220px" overflowY="auto" border="1px" borderColor="whiteAlpha.300" borderRadius="md" p={3}>
                          <CheckboxGroup value={selectedEmployeeIds} onChange={(values) => setSelectedEmployeeIds(values as string[])}>
                            <Stack spacing={2}>
                              {employees.map((employee) => (
                                <Checkbox key={employee.id} value={employee.id} color="white">
                                  {employee.display_name || employee.email} ({employee.role})
                                </Checkbox>
                              ))}
                            </Stack>
                          </CheckboxGroup>
                        </Box>
                      </FormControl>

                      <FormControl maxW="220px">
                        <FormLabel color="whiteAlpha.900">Due Date</FormLabel>
                        <Input type="date" variant="filled" color="white" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                      </FormControl>

                      <Button
                        variant="gradient"
                        alignSelf="start"
                        isDisabled={!assignSetId || selectedEmployeeIds.length === 0}
                        isLoading={assigning}
                        onClick={handleAssign}
                      >
                        Assign to Selected
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>

                {assignSetId && (
                  <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                    <CardBody>
                      <Heading size="sm" color="white" mb={4}>
                        Assignment History
                      </Heading>
                      {loadingAssignments ? (
                        <Text color="whiteAlpha.700">Loading…</Text>
                      ) : assignments.length === 0 ? (
                        <Text color="whiteAlpha.700" fontSize="sm">
                          No one has been assigned this set yet.
                        </Text>
                      ) : (
                        <Box overflowX="auto">
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th color="whiteAlpha.700">Employee</Th>
                                <Th color="whiteAlpha.700">Assigned</Th>
                                <Th color="whiteAlpha.700">Due</Th>
                                <Th color="whiteAlpha.700">Status</Th>
                                <Th color="whiteAlpha.700">Progress</Th>
                                <Th color="whiteAlpha.700">Actions</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {assignments.map((row) => {
                                const employee = employeeById(row.employee_id);
                                const overdue = isOverdue(row);
                                return (
                                  <Tr key={row.id}>
                                    <Td color="white">{employee?.display_name || employee?.email || row.employee_id}</Td>
                                    <Td color="whiteAlpha.700">{formatDate(row.assigned_at)}</Td>
                                    <Td color="whiteAlpha.700">{formatDate(row.due_date)}</Td>
                                    <Td>
                                      <HStack>
                                        {overdue && <Badge colorScheme="red">Overdue</Badge>}
                                        <Badge colorScheme={row.status === 'Completed' ? 'green' : 'orange'}>{row.status}</Badge>
                                      </HStack>
                                    </Td>
                                    <Td color="whiteAlpha.700">
                                      {row.signed_count} of {row.total_policies}
                                    </Td>
                                    <Td>
                                      <Button size="xs" variant="outline" onClick={() => openView(row)}>
                                        View
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
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      {/* New Policy Set modal */}
      <Modal isOpen={newSetModal.isOpen} onClose={newSetModal.onClose}>
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="whiteAlpha.200">
          <ModalHeader color="white">New Policy Set</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Name</FormLabel>
                <Input
                  variant="filled"
                  color="white"
                  placeholder="e.g., Onboarding Policies"
                  value={newSetForm.name}
                  onChange={(e) => setNewSetForm({ ...newSetForm, name: e.target.value })}
                />
              </FormControl>
              <FormControl>
                <FormLabel color="whiteAlpha.900">Description</FormLabel>
                <Textarea
                  variant="filled"
                  color="white"
                  value={newSetForm.description}
                  onChange={(e) => setNewSetForm({ ...newSetForm, description: e.target.value })}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" color="white" mr={3} onClick={newSetModal.onClose}>
              Cancel
            </Button>
            <Button variant="gradient" isLoading={savingSet} isDisabled={!newSetForm.name.trim()} onClick={handleCreateSet}>
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <PolicyEditorModal
        key={`${policyEditorModal.isOpen}-${editingPolicy?.id || 'new'}`}
        isOpen={policyEditorModal.isOpen}
        onClose={policyEditorModal.onClose}
        policy={editingPolicy}
        saving={savingPolicy}
        onSave={handleSavePolicy}
      />

      {viewAssignment && (
        <PolicySigningModal
          isOpen={viewModal.isOpen}
          onClose={viewModal.onClose}
          assignment={viewAssignment}
          policySetName={policySets.find((s) => s.id === viewAssignment.policy_set_id)?.name || 'Policy Set'}
          employeeName={employeeById(viewAssignment.employee_id)?.display_name || employeeById(viewAssignment.employee_id)?.email}
          readOnly
        />
      )}
    </Layout>
  );
};

export default PoliciesManagement;
