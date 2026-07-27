import React, { useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Box,
  HStack,
  VStack,
  Text,
  Badge,
  Button,
  Checkbox,
  Image,
  Divider,
  useToast,
  Icon,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getSecureDocumentUrl } from '../utils/documentUrl';
import SignaturePad from './SignaturePad';
import { sendNotification, getUserInfo } from '../utils/notifications';
import type { Policy, PolicyAssignment, PolicySignature, EmployeeSignature } from '../types';
import './policy-editor.css';

interface PolicySigningModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: PolicyAssignment;
  policySetName: string;
  employeeName?: string; // shown only when readOnly (HR audit view)
  readOnly: boolean;
  onCompleted?: () => void;
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PolicySigningModal: React.FC<PolicySigningModalProps> = ({
  isOpen,
  onClose,
  assignment,
  policySetName,
  employeeName,
  readOnly,
  onCompleted,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [signatures, setSignatures] = useState<PolicySignature[]>([]);
  const [mySignature, setMySignature] = useState<EmployeeSignature | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signing, setSigning] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const wasCompleteRef = React.useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    } else {
      setSelectedPolicyId(null);
      setAgreed(false);
      setShowSignaturePad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assignment.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: policyRows, error: policyError }, { data: sigRows, error: sigError }] = await Promise.all([
        supabase.from('policies').select('*').eq('policy_set_id', assignment.policy_set_id).order('order_index'),
        supabase.from('policy_signatures').select('*').eq('assignment_id', assignment.id),
      ]);

      if (policyError) throw policyError;
      if (sigError) throw sigError;

      const fetchedPolicies = policyRows || [];
      const fetchedSignatures = sigRows || [];
      setPolicies(fetchedPolicies);
      setSignatures(fetchedSignatures);
      wasCompleteRef.current =
        fetchedPolicies.length > 0 && fetchedPolicies.every((p) => fetchedSignatures.some((s) => s.policy_id === p.id));

      const signedIds = new Set(fetchedSignatures.map((s) => s.policy_id));
      const firstUnsigned = fetchedPolicies.find((p) => !signedIds.has(p.id));
      setSelectedPolicyId((firstUnsigned || fetchedPolicies[0])?.id || null);

      if (!readOnly && currentUser) {
        const { data: sig } = await supabase
          .from('employee_signatures')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        setMySignature(sig || null);
      }
    } catch (error: any) {
      toast({ title: 'Error loading policy', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAgreed(false);
    setShowSignaturePad(false);
  }, [selectedPolicyId]);

  const loadImageUrl = async (filePath: string) => {
    if (imageUrls[filePath]) return;
    try {
      const url = await getSecureDocumentUrl(filePath);
      setImageUrls((prev) => ({ ...prev, [filePath]: url }));
    } catch {
      // non-fatal — the <img> will just show broken until retried
    }
  };

  useEffect(() => {
    if (mySignature) loadImageUrl(mySignature.file_path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mySignature]);

  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId) || null;
  const signatureFor = (policyId: string) => signatures.find((s) => s.policy_id === policyId) || null;
  const selectedSignature = selectedPolicy ? signatureFor(selectedPolicy.id) : null;

  useEffect(() => {
    if (selectedSignature) loadImageUrl(selectedSignature.signature_file_path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSignature]);

  const signedCount = policies.filter((p) => signatureFor(p.id)).length;
  const isComplete = policies.length > 0 && signedCount === policies.length;

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

      const { data: upserted, error: upsertError } = await supabase
        .from('employee_signatures')
        .upsert({ user_id: currentUser.id, file_path: filePath }, { onConflict: 'user_id' })
        .select()
        .single();
      if (upsertError) throw upsertError;

      setMySignature(upserted);
      setShowSignaturePad(false);
      toast({ title: 'Signature saved', status: 'success', duration: 3000 });
    } catch (error: any) {
      toast({ title: 'Error saving signature', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setSavingSignature(false);
    }
  };

  const handleSign = async () => {
    if (!currentUser || !selectedPolicy || !mySignature) return;
    setSigning(true);
    try {
      const destPath = `${currentUser.id}/policy-signatures/${assignment.id}_${selectedPolicy.id}.png`;
      const { error: copyError } = await supabase.storage.from('documents').copy(mySignature.file_path, destPath);
      if (copyError) throw copyError;

      const { data: newSig, error: insertError } = await supabase
        .from('policy_signatures')
        .insert({
          assignment_id: assignment.id,
          policy_id: selectedPolicy.id,
          employee_id: currentUser.id,
          signature_file_path: destPath,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const updatedSignatures = [...signatures, newSig];
      setSignatures(updatedSignatures);
      setAgreed(false);

      const nowComplete = policies.every((p) => updatedSignatures.some((s) => s.policy_id === p.id));
      if (nowComplete && !wasCompleteRef.current) {
        wasCompleteRef.current = true;
        toast({ title: 'All policies signed', status: 'success', duration: 4000 });
        onCompleted?.();

        getUserInfo(assignment.assigned_by).then((assigner) => {
          if (!assigner) return;
          sendNotification({
            type: 'policy_set_completed',
            to_email: assigner.email,
            to_name: assigner.name,
            data: {
              employee_name: currentUser.email || 'An employee',
              policy_set_name: policySetName,
            },
          });
        });
      } else {
        toast({ title: 'Policy signed', status: 'success', duration: 2500 });
      }

      const signedIds = new Set(updatedSignatures.map((s) => s.policy_id));
      const nextUnsigned = policies.find((p) => !signedIds.has(p.id));
      setSelectedPolicyId(nextUnsigned ? nextUnsigned.id : selectedPolicy.id);
    } catch (error: any) {
      toast({ title: 'Error signing policy', description: error.message, status: 'error', duration: 5000 });
    } finally {
      setSigning(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent bg="#1a1a1a" borderColor="whiteAlpha.200" maxH="90vh">
        <ModalHeader color="white">
          <HStack justify="space-between" align="start" flexWrap="wrap">
            <Box>
              <Text>{policySetName}</Text>
              {employeeName && (
                <Text fontSize="sm" fontWeight="normal" color="whiteAlpha.700">
                  {employeeName}
                </Text>
              )}
            </Box>
            <HStack>
              {assignment.due_date && <Badge colorScheme="purple">Due {formatDate(assignment.due_date)}</Badge>}
              <Badge colorScheme={isComplete ? 'green' : 'orange'}>
                {signedCount} of {policies.length} signed
              </Badge>
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody>
          <HStack align="stretch" spacing={4} h="60vh">
            <VStack
              w="240px"
              flexShrink={0}
              align="stretch"
              spacing={1}
              overflowY="auto"
              borderRight="1px solid"
              borderColor="whiteAlpha.200"
              pr={3}
            >
              {policies.map((policy) => {
                const signed = !!signatureFor(policy.id);
                const isSelected = policy.id === selectedPolicyId;
                return (
                  <HStack
                    key={policy.id}
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    bg={isSelected ? 'whiteAlpha.200' : 'transparent'}
                    _hover={{ bg: 'whiteAlpha.100' }}
                    onClick={() => setSelectedPolicyId(policy.id)}
                    justify="space-between"
                  >
                    <Text fontSize="sm" color="white" noOfLines={2}>
                      {policy.title}
                    </Text>
                    {signed && <Icon as={CheckCircleIcon} color="green.400" flexShrink={0} />}
                  </HStack>
                );
              })}
            </VStack>

            <VStack flex={1} align="stretch" spacing={3} overflowY="auto">
              {loading && <Text color="whiteAlpha.700">Loading…</Text>}
              {!loading && selectedPolicy && (
                <>
                  <Text fontSize="lg" fontWeight="bold" color="white">
                    {selectedPolicy.title}
                  </Text>
                  <Box
                    className="tiptap-content"
                    color="whiteAlpha.900"
                    bg="whiteAlpha.50"
                    borderRadius="md"
                    p={4}
                    dangerouslySetInnerHTML={{ __html: selectedPolicy.content }}
                  />

                  <Divider borderColor="whiteAlpha.200" />

                  {selectedSignature ? (
                    <VStack align="start" spacing={2}>
                      <Text fontSize="sm" color="green.300">
                        Signed on {formatDate(selectedSignature.signed_at)}
                      </Text>
                      {imageUrls[selectedSignature.signature_file_path] && (
                        <Image
                          src={imageUrls[selectedSignature.signature_file_path]}
                          alt="Signature"
                          maxH="80px"
                          bg="white"
                          borderRadius="md"
                          p={1}
                        />
                      )}
                    </VStack>
                  ) : readOnly ? (
                    <Text fontSize="sm" color="whiteAlpha.600">
                      Not yet signed by the employee.
                    </Text>
                  ) : !mySignature ? (
                    <VStack align="stretch" spacing={3}>
                      <Text fontSize="sm" color="whiteAlpha.800">
                        Create your signature to continue. You'll reuse this for every policy you sign.
                      </Text>
                      <SignaturePad onSave={handleSaveSignature} saving={savingSignature} />
                    </VStack>
                  ) : showSignaturePad ? (
                    <SignaturePad
                      onSave={handleSaveSignature}
                      onCancel={() => setShowSignaturePad(false)}
                      saving={savingSignature}
                    />
                  ) : (
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="whiteAlpha.700">
                          Your signature
                        </Text>
                        <Button size="xs" variant="link" color="brand.300" onClick={() => setShowSignaturePad(true)}>
                          Redraw signature
                        </Button>
                      </HStack>
                      {imageUrls[mySignature.file_path] && (
                        <Image
                          src={imageUrls[mySignature.file_path]}
                          alt="Your signature"
                          maxH="80px"
                          bg="white"
                          borderRadius="md"
                          p={1}
                          alignSelf="start"
                        />
                      )}
                      <Checkbox isChecked={agreed} onChange={(e) => setAgreed(e.target.checked)} color="white">
                        I have read and agree to this policy
                      </Checkbox>
                      <Button
                        variant="gradient"
                        alignSelf="start"
                        isDisabled={!agreed}
                        isLoading={signing}
                        onClick={handleSign}
                      >
                        Sign
                      </Button>
                    </VStack>
                  )}
                </>
              )}
              {!loading && !selectedPolicy && (
                <Text color="whiteAlpha.700">This policy set has no policies yet.</Text>
              )}
            </VStack>
          </HStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" color="white" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PolicySigningModal;
