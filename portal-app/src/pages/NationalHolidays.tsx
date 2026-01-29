import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
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
  HStack,
  Text,
  Input,
  Select,
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
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

interface NationalHoliday {
  id: string;
  name: string;
  date: string;
  year: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const NationalHolidays: React.FC = () => {
  const { userData } = useAuth();
  const [holidays, setHolidays] = useState<NationalHoliday[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [editingHoliday, setEditingHoliday] = useState<NationalHoliday | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Default holidays template
  const defaultHolidays2026 = [
    { name: 'Republic Day', date: '2026-01-26', type: 'National' },
    { name: 'Independence Day', date: '2026-08-15', type: 'National' },
    { name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'National' },
    { name: 'Holi', date: '2026-03-04', type: 'Gazetted' },
    { name: 'Id-ul-Fitr (Ramadan Eid)', date: '2026-03-21', type: 'Gazetted' },
    { name: 'Ram Navami', date: '2026-03-26', type: 'Gazetted' },
    { name: 'Mahavir Jayanti', date: '2026-03-31', type: 'Gazetted' },
    { name: 'Good Friday', date: '2026-04-03', type: 'Gazetted' },
    { name: 'Buddha Purnima', date: '2026-05-01', type: 'Gazetted' },
    { name: 'Id-ul-Zuha (Bakrid)', date: '2026-05-27', type: 'Gazetted' },
    { name: 'Muharram', date: '2026-06-26', type: 'Gazetted' },
    { name: 'Id-e-Milad (Prophet\'s Birthday)', date: '2026-08-26', type: 'Gazetted' },
    { name: 'Janmashtami', date: '2026-09-04', type: 'Gazetted' },
    { name: 'Dussehra (Vijayadashami)', date: '2026-10-20', type: 'Gazetted' },
    { name: 'Diwali (Deepavali)', date: '2026-11-08', type: 'Gazetted' },
    { name: 'Guru Nanak Jayanti', date: '2026-11-24', type: 'Gazetted' },
    { name: 'Christmas Day', date: '2026-12-25', type: 'Gazetted' },
    { name: 'New Year\'s Day', date: '2026-01-01', type: 'Restricted' },
    { name: 'Makar Sankranti / Pongal', date: '2026-01-14', type: 'Restricted' },
    { name: 'Maha Shivratri', date: '2026-02-15', type: 'Restricted' },
    { name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'Restricted' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    year: selectedYear,
    is_active: true,
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('national_holidays')
        .select('*')
        .eq('year', selectedYear)
        .order('date', { ascending: true });

      if (error) throw error;

      setHolidays(data || []);
    } catch (error: any) {
      console.error('Error fetching holidays:', error);
      toast({
        title: 'Error fetching holidays',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleOpenModal = (holiday?: NationalHoliday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date,
        year: holiday.year,
        is_active: holiday.is_active,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: '',
        date: '',
        year: selectedYear,
        is_active: true,
      });
    }
    onOpen();
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const holidayData = {
        name: formData.name,
        date: formData.date,
        year: formData.year,
        is_active: formData.is_active,
      };

      if (editingHoliday) {
        // Update existing holiday
        const { error } = await supabase
          .from('national_holidays')
          .update(holidayData)
          .eq('id', editingHoliday.id);

        if (error) throw error;

        toast({
          title: 'Holiday updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        // Create new holiday
        const { error } = await supabase
          .from('national_holidays')
          .insert([holidayData]);

        if (error) throw error;

        toast({
          title: 'Holiday created successfully',
          status: 'success',
          duration: 3000,
        });
      }

      onClose();
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error saving holiday',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('national_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Holiday deleted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error deleting holiday',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (holiday: NationalHoliday) => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('national_holidays')
        .update({ is_active: !holiday.is_active })
        .eq('id', holiday.id);

      if (error) throw error;

      toast({
        title: `Holiday ${!holiday.is_active ? 'activated' : 'deactivated'}`,
        status: 'success',
        duration: 3000,
      });

      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error updating holiday',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    if (!confirm('This will add default holidays for 2026. Continue?')) return;

    setLoading(true);

    try {
      const holidaysToInsert = defaultHolidays2026.map(h => ({
        name: h.name,
        date: h.date,
        year: 2026,
        is_active: true,
      }));

      const { error } = await supabase
        .from('national_holidays')
        .insert(holidaysToInsert);

      if (error) throw error;

      toast({
        title: 'Default holidays loaded',
        status: 'success',
        duration: 3000,
      });

      setSelectedYear(2026);
      fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error loading defaults',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      weekday: 'short'
    });
  };

  const isAdmin = userData?.role === 'Administrator';

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
          <Heading size="lg" color="white">National Holidays</Heading>
          <HStack spacing={3}>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              maxW="150px"
              variant="filled"
              color="white"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            {isAdmin && (
              <>
                <Button
                  leftIcon={<AddIcon />}
                  variant="outline"
                  color="whiteAlpha.900"
                  borderColor="rgba(255, 255, 255, 0.2)"
                  _hover={{ bg: 'rgba(255, 255, 255, 0.1)', borderColor: 'brand.400' }}
                  onClick={() => handleOpenModal()}
                >
                  Add Holiday
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleLoadDefaults}
                  isLoading={loading}
                >
                  Load 2026 Defaults
                </Button>
              </>
            )}
          </HStack>
        </Box>

        <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
          <CardBody>
            {holidays.length === 0 ? (
              <Box textAlign="center" py={10}>
                <Text color="whiteAlpha.700" fontSize="lg">
                  No holidays configured for {selectedYear}
                </Text>
                {isAdmin && (
                  <Button mt={4} variant="gradient" onClick={handleLoadDefaults}>
                    Load Default Holidays
                  </Button>
                )}
              </Box>
            ) : (
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.700">Holiday Name</Th>
                    <Th color="whiteAlpha.700">Date</Th>
                    <Th color="whiteAlpha.700">Status</Th>
                    {isAdmin && <Th color="whiteAlpha.700">Actions</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {holidays.map((holiday) => (
                    <Tr key={holiday.id}>
                      <Td color="white">{holiday.name}</Td>
                      <Td color="whiteAlpha.900">{formatDate(holiday.date)}</Td>
                      <Td>
                        <Badge colorScheme={holiday.is_active ? 'green' : 'red'}>
                          {holiday.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      {isAdmin && (
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              aria-label="Edit holiday"
                              icon={<EditIcon />}
                              size="sm"
                              variant="ghost"
                              color="blue.400"
                              onClick={() => handleOpenModal(holiday)}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              colorScheme={holiday.is_active ? 'red' : 'green'}
                              onClick={() => handleToggleActive(holiday)}
                            >
                              {holiday.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <IconButton
                              aria-label="Delete holiday"
                              icon={<DeleteIcon />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDelete(holiday.id)}
                            />
                          </HStack>
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Add/Edit Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="rgba(255, 255, 255, 0.1)">
          <ModalHeader color="white">
            {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
          </ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Holiday Name</FormLabel>
                <Input
                  variant="filled"
                  placeholder="e.g., Diwali"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  color="white"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Date</FormLabel>
                <Input
                  variant="filled"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  color="white"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Year</FormLabel>
                <Select
                  variant="filled"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  color="white"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel color="whiteAlpha.900" mb="0">
                  Active
                </FormLabel>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '20px', height: '20px' }}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color="whiteAlpha.900">
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave} isLoading={loading}>
              {editingHoliday ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default NationalHolidays;
