import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
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
  VStack,
  Text,
  Checkbox,
} from '@chakra-ui/react';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { NationalHoliday } from '../../types';

const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<NationalHoliday[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<NationalHoliday | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    year: new Date().getFullYear(),
    isActive: true,
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const holidaysSnapshot = await getDocs(collection(db, 'nationalHolidays'));
      const holidaysData = holidaysSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as NationalHoliday[];
      holidaysData.sort((a, b) => a.date.getTime() - b.date.getTime());
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const handleCreateHoliday = () => {
    setSelectedHoliday(null);
    setFormData({
      name: '',
      date: '',
      year: new Date().getFullYear(),
      isActive: true,
    });
    onOpen();
  };

  const handleEditHoliday = (holiday: NationalHoliday) => {
    setSelectedHoliday(holiday);
    setFormData({
      name: holiday.name,
      date: new Date(holiday.date).toISOString().split('T')[0],
      year: holiday.year,
      isActive: holiday.isActive,
    });
    onOpen();
  };

  const handleSaveHoliday = async () => {
    setLoading(true);

    try {
      const holidayData = {
        name: formData.name,
        date: new Date(formData.date),
        year: formData.year,
        isActive: formData.isActive,
      };

      if (selectedHoliday) {
        await updateDoc(doc(db, 'nationalHolidays', selectedHoliday.id), holidayData);
      } else {
        await addDoc(collection(db, 'nationalHolidays'), holidayData);
      }

      toast({
        title: selectedHoliday ? 'Holiday updated' : 'Holiday created',
        status: 'success',
        duration: 3000,
      });

      await fetchHolidays();
      onClose();
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

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await deleteDoc(doc(db, 'nationalHolidays', id));
      toast({
        title: 'Holiday deleted',
        status: 'success',
        duration: 3000,
      });
      await fetchHolidays();
    } catch (error: any) {
      toast({
        title: 'Error deleting holiday',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="lg" fontWeight="bold">
            National Holidays ({holidays.length})
          </Text>
          <Button colorScheme="blue" onClick={handleCreateHoliday}>
            Add Holiday
          </Button>
        </Box>

        <Box overflowX="auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Holiday Name</Th>
                <Th>Date</Th>
                <Th>Year</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {holidays.map((holiday) => (
                <Tr key={holiday.id}>
                  <Td fontWeight="bold">{holiday.name}</Td>
                  <Td>{new Date(holiday.date).toLocaleDateString()}</Td>
                  <Td>{holiday.year}</Td>
                  <Td>
                    <Badge colorScheme={holiday.isActive ? 'green' : 'gray'}>
                      {holiday.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>
                    <Button size="sm" mr={2} onClick={() => handleEditHoliday(holiday)}>
                      Edit
                    </Button>
                    <Button size="sm" colorScheme="red" onClick={() => handleDeleteHoliday(holiday.id)}>
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Holiday Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Republic Day"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Date</FormLabel>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    const year = new Date(e.target.value).getFullYear();
                    setFormData({ ...formData, date: e.target.value, year });
                  }}
                />
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                >
                  Active
                </Checkbox>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveHoliday} isLoading={loading}>
              {selectedHoliday ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default HolidayManagement;
