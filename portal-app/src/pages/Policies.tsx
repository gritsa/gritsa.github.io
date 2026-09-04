import React, { useEffect, useState } from 'react';
import {
  Heading,
  VStack,
  HStack,
  Card,
  CardBody,
  Text,
  Badge,
  Button,
  Image,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
} from '@chakra-ui/react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { getSecureDocumentUrl } from '../utils/documentUrl';
import SignaturePad from '../components/SignaturePad';
import PolicySigningModal from '../components/PolicySigningModal';
import type { PolicyAssignment, EmployeeSignature } from '../types';

interface AssignmentWithSet extends PolicyAssignment {
  policy_sets: { name: string; description: string | null } | null;
  total_policies: number;
  signed_count: number;
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(assignment: AssignmentWithSet): boolean {
  return assignment.status !== 'Completed' && !!assignment.due_date && new Date(assignment.due_date) < new Date();
}

const Policies: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [assignments, setAssignments] = useState<AssignmentWithSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySignature, setMySignature] = useState<EmployeeSignature | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);

  const signaturePadModal = useDisclosure();
  const signingModal = useDisclosure();
  const [activeAssignment, setActiveAssignment] = useState<AssignmentWithSet | null>(null);

  useEffect(() => {
    fetchAssignments();
    fetchMySignature();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const fetchMySignature = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('employee_signatures').select('*').eq('user_id', currentUser.id).maybeSingle();
    setMySignature(data || null);
    if (data) {
      try {
        setSignatureUrl(await getSecureDocumentUrl(data.file_path));
      } catch {
        // non-fatal
      }
    }
  };

  const fetchAssignments = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('policy_assignments')
        .select('*, policy_sets(name, description)')
        .eq('employee_id', currentUser.id)
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

  const handleSaveSignature = async (blob: Blob) => {
    if (!currentUser) return;
    setSavingSignature(true);
    try {
      const filePath = `${currentUser.id}/signature/signature.png`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, blob, {
        upsert: true,
        contentType: 'image/png',
      });
      if (uploadError) throw uploadError;

      const { error: upsertError } = await supabase
        .from('employee_signatures')
        .upsert({ user_id: currentUser.id, file_path: filePath }, { onConflict: 'user_id' });
      if (upsertError) throw upsertError;

      toast({ title: 'Signature saved', status: 'success', duration: 3000 });
      signaturePadModal.onClose();
      await fetchMySignature();
    } catch (error: any) {
      toast({ title: 'Error saving signature', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setSavingSignature(false);
    }
  };

  const openAssignment = (assignment: AssignmentWithSet) => {
    setActiveAssignment(assignment);
    signingModal.onOpen();
  };

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="white">
          Policies
        </Heading>

        <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
          <CardBody>
            <HStack justify="space-between" align="start" flexWrap="wrap">
              <VStack align="start" spacing={2}>
                <Heading size="sm" color="white">
                  Your Signature
                </Heading>
                {mySignature && signatureUrl ? (
                  <Image src={signatureUrl} alt="Your signature" maxH="70px" bg="white" borderRadius="md" p={1} />
                ) : (
                  <Text fontSize="sm" color="whiteAlpha.700">
                    You haven't created a signature yet. You'll need one before signing any policy.
                  </Text>
                )}
              </VStack>
              <Button size="sm" variant="outline" onClick={signaturePadModal.onOpen}>
                {mySignature ? 'Redraw Signature' : 'Create Signature'}
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {loading ? (
          <Text color="whiteAlpha.700">Loading…</Text>
        ) : assignments.length === 0 ? (
          <Card bg="rgba(255, 255, 255, 0.05)">
            <CardBody>
              <Text color="whiteAlpha.700">No policies have been assigned to you yet.</Text>
            </CardBody>
          </Card>
        ) : (
          assignments.map((assignment) => {
            const overdue = isOverdue(assignment);
            return (
              <Card key={assignment.id} bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                <CardBody>
                  <HStack justify="space-between" align="start" flexWrap="wrap">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold" color="white">
                        {assignment.policy_sets?.name || 'Policy Set'}
                      </Text>
                      {assignment.policy_sets?.description && (
                        <Text fontSize="sm" color="whiteAlpha.700">
                          {assignment.policy_sets.description}
                        </Text>
                      )}
                      <HStack fontSize="xs" color="whiteAlpha.600" spacing={4}>
                        <Text>Assigned {formatDate(assignment.assigned_at)}</Text>
                        {assignment.due_date && <Text>Due {formatDate(assignment.due_date)}</Text>}
                      </HStack>
                    </VStack>
                    <VStack align="end" spacing={2}>
                      <HStack>
                        {overdue && <Badge colorScheme="red">Overdue</Badge>}
                        <Badge colorScheme={assignment.status === 'Completed' ? 'green' : 'orange'}>
                          {assignment.status}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="whiteAlpha.600">
                        {assignment.signed_count} of {assignment.total_policies} signed
                      </Text>
                      <Button size="sm" variant="gradient" onClick={() => openAssignment(assignment)}>
                        {assignment.status === 'Completed' ? 'View Signed Documents' : 'Review & Sign'}
                      </Button>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            );
          })
        )}
      </VStack>

      <Modal isOpen={signaturePadModal.isOpen} onClose={signaturePadModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="whiteAlpha.200">
          <ModalHeader color="white">{mySignature ? 'Redraw Signature' : 'Create Signature'}</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody pb={6}>
            <SignaturePad onSave={handleSaveSignature} onCancel={signaturePadModal.onClose} saving={savingSignature} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {activeAssignment && (
        <PolicySigningModal
          isOpen={signingModal.isOpen}
          onClose={() => {
            signingModal.onClose();
            fetchAssignments();
          }}
          assignment={activeAssignment}
          policySetName={activeAssignment.policy_sets?.name || 'Policy Set'}
          readOnly={false}
          onCompleted={fetchAssignments}
        />
      )}
    </Layout>
  );
};

export default Policies;
