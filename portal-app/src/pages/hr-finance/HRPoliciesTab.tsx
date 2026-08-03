import React, { useEffect, useState } from 'react';
import {
  VStack,
  Box,
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
  HStack,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import PolicySigningModal from '../../components/PolicySigningModal';
import { downloadSignedPolicyPacket } from '../../utils/policyDocumentPdf';
import type { PolicyAssignment } from '../../types';

interface HRPoliciesTabProps {
  employeeId: string;
  employeeName: string;
}

interface AssignmentRow extends PolicyAssignment {
  policy_sets: { name: string; description: string | null } | null;
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

/** Per-employee view of every policy set they've ever been assigned, across all sets — lets HR
 *  track signing progress and pull a signed-document packet without going through the global
 *  Manage Policies page (which is set-centric, not employee-centric). */
const HRPoliciesTab: React.FC<HRPoliciesTabProps> = ({ employeeId, employeeName }) => {
  const toast = useToast();
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewAssignment, setViewAssignment] = useState<AssignmentRow | null>(null);
  const viewModal = useDisclosure();

  useEffect(() => {
    fetchAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('policy_assignments')
        .select('*, policy_sets(name, description)')
        .eq('employee_id', employeeId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const rows = data || [];
      const withCounts = await Promise.all(
        rows.map(async (row: any) => {
          const [{ count: totalCount }, { count: signedCount }] = await Promise.all([
            supabase.from('policies').select('id', { count: 'exact', head: true }).eq('policy_set_id', row.policy_set_id),
            supabase.from('policy_signatures').select('id', { count: 'exact', head: true }).eq('assignment_id', row.id),
          ]);
          return { ...row, total_policies: totalCount || 0, signed_count: signedCount || 0 };
        })
      );

      setAssignments(withCounts);
    } catch (error: any) {
      toast({ title: 'Error fetching policies', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (row: AssignmentRow) => {
    setDownloadingId(row.id);
    try {
      const result = await downloadSignedPolicyPacket(row, row.policy_sets?.name || 'Policy Set', employeeName);
      if (result === 'no-signatures') {
        toast({
          title: 'Nothing signed yet',
          description: 'This employee has not signed any policy in this set.',
          status: 'warning',
          duration: 4000,
        });
      } else if (result === 'popup-blocked') {
        toast({ title: 'Popup blocked', description: 'Please allow popups to download the PDF', status: 'error', duration: 5000 });
      }
    } catch (error: any) {
      toast({ title: 'Error generating document', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setDownloadingId(null);
    }
  };

  const openView = (row: AssignmentRow) => {
    setViewAssignment(row);
    viewModal.onOpen();
  };

  return (
    <VStack spacing={6} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">
            Policies
          </Heading>
          {loading ? (
            <Text color="whiteAlpha.700">Loading…</Text>
          ) : assignments.length === 0 ? (
            <Text color="whiteAlpha.700" fontSize="sm">
              No policies have been assigned to this employee yet.
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.700">Policy Set</Th>
                    <Th color="whiteAlpha.700">Assigned</Th>
                    <Th color="whiteAlpha.700">Due</Th>
                    <Th color="whiteAlpha.700">Status</Th>
                    <Th color="whiteAlpha.700">Progress</Th>
                    <Th color="whiteAlpha.700">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {assignments.map((row) => (
                    <Tr key={row.id}>
                      <Td color="white">{row.policy_sets?.name || 'Policy Set'}</Td>
                      <Td color="whiteAlpha.700">{formatDate(row.assigned_at)}</Td>
                      <Td color="whiteAlpha.700">{formatDate(row.due_date)}</Td>
                      <Td>
                        <HStack>
                          {isOverdue(row) && <Badge colorScheme="red">Overdue</Badge>}
                          <Badge colorScheme={row.status === 'Completed' ? 'green' : 'orange'}>{row.status}</Badge>
                        </HStack>
                      </Td>
                      <Td color="whiteAlpha.700">
                        {row.signed_count} of {row.total_policies}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button size="xs" variant="outline" onClick={() => openView(row)}>
                            View
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            isDisabled={row.signed_count === 0}
                            isLoading={downloadingId === row.id}
                            onClick={() => handleDownload(row)}
                          >
                            Download PDF
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      {viewAssignment && (
        <PolicySigningModal
          isOpen={viewModal.isOpen}
          onClose={viewModal.onClose}
          assignment={viewAssignment}
          policySetName={viewAssignment.policy_sets?.name || 'Policy Set'}
          employeeName={employeeName}
          readOnly
        />
      )}
    </VStack>
  );
};

export default HRPoliciesTab;
