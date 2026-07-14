import React, { useEffect, useState } from 'react';
import {
  VStack,
  HStack,
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Button,
  Badge,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  Textarea,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { EmployeeOffboarding } from '../../types';
import { sendNotification } from '../../utils/notifications';

interface OffboardingTabProps {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
}

const DEFAULT_NOTICE_PERIOD_MONTHS = 2;

function daysFromTodayInMonths(months: number): number {
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + months);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: string | Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STAGES = [
  {
    key: 1 as const,
    title: 'Stage 1: Exit Interview & Discussion',
    description: 'Conduct the exit interview. The employee can be retained here, which ends the offboarding process.',
  },
  {
    key: 2 as const,
    title: 'Stage 2: Handover of Responsibilities',
    description: 'Confirm handover of ongoing work, projects, and access to the team.',
  },
  {
    key: 3 as const,
    title: 'Stage 3: First Level Exit Documents',
    description: 'Collect and process the initial round of exit documentation.',
  },
  {
    key: 4 as const,
    title: 'Stage 4: Final Exit Documents',
    description: 'Send the NOC and final salary details to the employee’s personal email.',
  },
];

const OffboardingTab: React.FC<OffboardingTabProps> = ({ employeeId, employeeName, employeeEmail }) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [history, setHistory] = useState<EmployeeOffboarding[]>([]);
  const [loading, setLoading] = useState(false);

  // Start-process form state
  const [noticeDays, setNoticeDays] = useState(daysFromTodayInMonths(DEFAULT_NOTICE_PERIOD_MONTHS));
  const [startPersonalEmail, setStartPersonalEmail] = useState('');

  // Active-record editable fields
  const [editNoticeDays, setEditNoticeDays] = useState<number | null>(null);
  const [personalEmail, setPersonalEmail] = useState('');
  const [stageNotes, setStageNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchHistory();
    // Reset transient form state whenever the selected employee changes
    setNoticeDays(daysFromTodayInMonths(DEFAULT_NOTICE_PERIOD_MONTHS));
    setStartPersonalEmail('');
    setStageNotes({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_offboarding')
        .select('*')
        .eq('employee_id', employeeId)
        .order('initiated_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
      const active = (data || []).find((r) => r.status === 'Active');
      setPersonalEmail(active?.personal_email || '');
      setEditNoticeDays(active?.notice_period_days ?? null);
    } catch (error: any) {
      toast({
        title: 'Error fetching offboarding data',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const activeRecord = history.find((r) => r.status === 'Active') || null;
  const pastRecords = history.filter((r) => r.status !== 'Active');

  const handleStart = async () => {
    if (!currentUser) return;
    if (!noticeDays || noticeDays <= 0) {
      toast({ title: 'Notice period must be at least 1 day', status: 'error', duration: 4000 });
      return;
    }

    setLoading(true);
    try {
      const initiatedAt = new Date().toISOString();
      const lastWorkingDate = addDays(initiatedAt, noticeDays);

      const { error } = await supabase.from('employee_offboarding').insert({
        employee_id: employeeId,
        initiated_by: currentUser.id,
        initiated_at: initiatedAt,
        notice_period_days: noticeDays,
        last_working_date: lastWorkingDate,
        personal_email: startPersonalEmail || null,
        status: 'Active',
      });

      if (error) throw error;

      toast({
        title: 'Offboarding process started',
        description: `Last working date set to ${formatDate(lastWorkingDate)}`,
        status: 'success',
        duration: 4000,
      });

      sendNotification({
        type: 'offboarding_started',
        to_email: employeeEmail,
        to_name: employeeName,
        data: {
          employee_name: employeeName,
          last_working_date: formatDate(lastWorkingDate),
          notice_period_days: String(noticeDays),
        },
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error starting offboarding process',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNoticePeriod = async () => {
    if (!activeRecord || !editNoticeDays || editNoticeDays <= 0) {
      toast({ title: 'Notice period must be at least 1 day', status: 'error', duration: 4000 });
      return;
    }

    setLoading(true);
    try {
      const lastWorkingDate = addDays(activeRecord.initiated_at, editNoticeDays);

      const { error } = await supabase
        .from('employee_offboarding')
        .update({ notice_period_days: editNoticeDays, last_working_date: lastWorkingDate })
        .eq('id', activeRecord.id);

      if (error) throw error;

      toast({
        title: 'Notice period updated',
        description: `Last working date is now ${formatDate(lastWorkingDate)}`,
        status: 'success',
        duration: 4000,
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error updating notice period',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePersonalEmail = async () => {
    if (!activeRecord) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_offboarding')
        .update({ personal_email: personalEmail || null })
        .eq('id', activeRecord.id);

      if (error) throw error;

      toast({ title: 'Personal email saved', status: 'success', duration: 3000 });
      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error saving personal email',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteStage = async (stage: 1 | 2 | 3 | 4) => {
    if (!activeRecord || !currentUser) return;

    if (stage === 4 && !personalEmail) {
      toast({
        title: 'Personal email required',
        description: 'Add the employee’s personal email before sending final exit documents.',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    try {
      const notes = stageNotes[stage] || '';
      const update: Record<string, any> = {
        [`stage${stage}_completed_at`]: new Date().toISOString(),
        [`stage${stage}_notes`]: notes || null,
      };

      if (stage === 4) {
        update.status = 'Completed';
        update.closed_at = new Date().toISOString();
        update.closed_by = currentUser.id;
      }

      const { error } = await supabase
        .from('employee_offboarding')
        .update(update)
        .eq('id', activeRecord.id);

      if (error) throw error;

      if (stage === 4) {
        sendNotification({
          type: 'exit_documents_ready',
          to_email: personalEmail,
          to_name: employeeName,
          data: {
            employee_name: employeeName,
          },
        });

        toast({ title: 'Offboarding completed', status: 'success', duration: 4000 });
      } else {
        toast({ title: `Stage ${stage} marked complete`, status: 'success', duration: 3000 });
      }

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error updating stage',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetain = async () => {
    if (!activeRecord || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_offboarding')
        .update({
          status: 'Retained',
          retained: true,
          stage1_completed_at: activeRecord.stage1_completed_at || new Date().toISOString(),
          stage1_notes: stageNotes[1] || activeRecord.stage1_notes || null,
          closed_at: new Date().toISOString(),
          closed_by: currentUser.id,
        })
        .eq('id', activeRecord.id);

      if (error) throw error;

      toast({
        title: 'Employee retained',
        description: 'The offboarding process has been closed.',
        status: 'success',
        duration: 4000,
      });

      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error retaining employee',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRecord || !currentUser) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_offboarding')
        .update({
          status: 'Cancelled',
          closed_at: new Date().toISOString(),
          closed_by: currentUser.id,
        })
        .eq('id', activeRecord.id);

      if (error) throw error;

      toast({ title: 'Offboarding process cancelled', status: 'info', duration: 4000 });
      await fetchHistory();
    } catch (error: any) {
      toast({
        title: 'Error cancelling process',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletedAt = (record: EmployeeOffboarding, stage: number): string | undefined => {
    return (record as any)[`stage${stage}_completed_at`];
  };

  const getStageNotes = (record: EmployeeOffboarding, stage: number): string | undefined => {
    return (record as any)[`stage${stage}_notes`];
  };

  const currentStageIndex = activeRecord
    ? STAGES.findIndex((s) => !getCompletedAt(activeRecord, s.key))
    : -1;

  if (!activeRecord) {
    return (
      <VStack spacing={6} align="stretch">
        <Card bg="rgba(255, 255, 255, 0.03)">
          <CardBody>
            <Heading size="sm" mb={4} color="white">Start Offboarding Process</Heading>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel color="whiteAlpha.900">Notice Period (days)</FormLabel>
                <NumberInput
                  min={1}
                  value={noticeDays}
                  onChange={(_, val) => setNoticeDays(isNaN(val) ? 0 : val)}
                >
                  <NumberInputField color="white" />
                </NumberInput>
                <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
                  Defaults to {daysFromTodayInMonths(DEFAULT_NOTICE_PERIOD_MONTHS)} days (2 months from today). Adjust for negotiated early release.
                </Text>
              </FormControl>

              <Box p={3} bg="rgba(255, 255, 255, 0.05)" borderRadius="md">
                <Text fontSize="sm" color="whiteAlpha.800">
                  Last working date will be <strong>{formatDate(addDays(new Date(), noticeDays || 0))}</strong>
                </Text>
              </Box>

              <FormControl>
                <FormLabel color="whiteAlpha.900">Personal Email (optional for now)</FormLabel>
                <Input
                  variant="filled"
                  type="email"
                  placeholder="employee's personal email"
                  value={startPersonalEmail}
                  onChange={(e) => setStartPersonalEmail(e.target.value)}
                  color="white"
                />
                <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
                  Required before final exit documents can be sent in Stage 4 — can be added later.
                </Text>
              </FormControl>

              <Button variant="gradient" onClick={handleStart} isLoading={loading} alignSelf="flex-start">
                Start Offboarding Process
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {pastRecords.length > 0 && (
          <Card bg="rgba(255, 255, 255, 0.03)">
            <CardBody>
              <Heading size="sm" mb={4} color="white">Offboarding History</Heading>
              <VStack align="stretch" spacing={3}>
                {pastRecords.map((r) => (
                  <Box key={r.id} p={3} bg="rgba(255, 255, 255, 0.05)" borderRadius="md">
                    <HStack justify="space-between">
                      <Badge colorScheme={r.status === 'Retained' ? 'purple' : r.status === 'Completed' ? 'green' : 'gray'}>
                        {r.status}
                      </Badge>
                      <Text fontSize="xs" color="whiteAlpha.600">
                        Initiated {formatDate(r.initiated_at)}
                      </Text>
                    </HStack>
                    <Text fontSize="sm" color="whiteAlpha.800" mt={1}>
                      Last working date: {formatDate(r.last_working_date)}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" align="start" mb={4} flexWrap="wrap">
            <Box>
              <Heading size="sm" color="white">Offboarding in Progress</Heading>
              <Text fontSize="xs" color="whiteAlpha.600">
                Initiated {formatDate(activeRecord.initiated_at)}
              </Text>
            </Box>
            <HStack>
              <Badge colorScheme="orange">Active</Badge>
              <Button size="sm" variant="outline" colorScheme="red" onClick={handleCancel} isLoading={loading}>
                Cancel Process
              </Button>
            </HStack>
          </HStack>

          <HStack spacing={4} align="end" flexWrap="wrap">
            <FormControl maxW="200px">
              <FormLabel color="whiteAlpha.900" fontSize="sm">Notice Period (days)</FormLabel>
              <NumberInput
                min={1}
                value={editNoticeDays ?? activeRecord.notice_period_days}
                onChange={(_, val) => setEditNoticeDays(isNaN(val) ? 0 : val)}
              >
                <NumberInputField color="white" />
              </NumberInput>
            </FormControl>
            <Button size="sm" onClick={handleUpdateNoticePeriod} isLoading={loading}>
              Update Notice Period
            </Button>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600">Last Working Date</Text>
              <Text fontSize="md" fontWeight="bold" color="white">{formatDate(activeRecord.last_working_date)}</Text>
            </Box>
          </HStack>

          <Divider my={4} borderColor="whiteAlpha.200" />

          <FormControl>
            <FormLabel color="whiteAlpha.900" fontSize="sm">Personal Email</FormLabel>
            <HStack>
              <Input
                variant="filled"
                type="email"
                placeholder="employee's personal email"
                value={personalEmail}
                onChange={(e) => setPersonalEmail(e.target.value)}
                color="white"
              />
              <Button size="sm" onClick={handleSavePersonalEmail} isLoading={loading}>
                Save
              </Button>
            </HStack>
            <Text fontSize="xs" color="whiteAlpha.600" mt={1}>
              Required to complete Stage 4 (final exit documents are sent here).
            </Text>
          </FormControl>
        </CardBody>
      </Card>

      {STAGES.map((stage, idx) => {
        const completedAt = getCompletedAt(activeRecord, stage.key);
        const isCompleted = !!completedAt;
        const isCurrent = idx === currentStageIndex;
        const isLocked = idx > currentStageIndex && currentStageIndex !== -1;

        return (
          <Card
            key={stage.key}
            bg="rgba(255, 255, 255, 0.03)"
            opacity={isLocked ? 0.5 : 1}
          >
            <CardBody>
              <HStack justify="space-between" mb={2}>
                <Heading size="sm" color="white">{stage.title}</Heading>
                <Badge colorScheme={isCompleted ? 'green' : isCurrent ? 'blue' : 'gray'}>
                  {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'}
                </Badge>
              </HStack>
              <Text fontSize="sm" color="whiteAlpha.700" mb={3}>{stage.description}</Text>

              {isCompleted ? (
                <VStack align="stretch" spacing={1}>
                  <Text fontSize="xs" color="whiteAlpha.600">Completed on {formatDate(completedAt)}</Text>
                  {getStageNotes(activeRecord, stage.key) && (
                    <Text fontSize="sm" color="whiteAlpha.800">{getStageNotes(activeRecord, stage.key)}</Text>
                  )}
                </VStack>
              ) : isCurrent ? (
                <VStack align="stretch" spacing={3}>
                  <Textarea
                    variant="filled"
                    placeholder="Notes (optional)"
                    value={stageNotes[stage.key] || ''}
                    onChange={(e) => setStageNotes({ ...stageNotes, [stage.key]: e.target.value })}
                    color="white"
                  />
                  <HStack>
                    <Button
                      variant="gradient"
                      size="sm"
                      onClick={() => handleCompleteStage(stage.key)}
                      isLoading={loading}
                    >
                      {stage.key === 4 ? 'Send Final Documents & Complete' : 'Mark Stage Complete'}
                    </Button>
                    {stage.key === 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="purple"
                        onClick={handleRetain}
                        isLoading={loading}
                      >
                        Retain Employee
                      </Button>
                    )}
                  </HStack>
                </VStack>
              ) : (
                <Text fontSize="xs" color="whiteAlpha.500">Complete the previous stage first</Text>
              )}
            </CardBody>
          </Card>
        );
      })}
    </VStack>
  );
};

export default OffboardingTab;
