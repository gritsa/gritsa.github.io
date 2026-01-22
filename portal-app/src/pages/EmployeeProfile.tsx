import React, { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Card,
  CardBody,
  SimpleGrid,
  Text,
  Button,
  useToast,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  Link,
} from '@chakra-ui/react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface EmployeeProfileData {
  user_id: string;
  full_name: string;
  date_of_birth?: string;
  phone: string;
  alternate_contact?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  pan_card_url?: string;
  aadhaar_card_url?: string;
}

const EmployeeProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    alternateContact: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const [files, setFiles] = useState<{
    panCard?: File;
    aadhaarCard?: File;
  }>({});

  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFormData({
          fullName: data.full_name,
          dateOfBirth: data.date_of_birth || '',
          phone: data.phone,
          alternateContact: data.alternate_contact || '',
          emergencyContactName: data.emergency_contact_name,
          emergencyContactPhone: data.emergency_contact_phone,
          emergencyContactRelationship: data.emergency_contact_relationship,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, docType: 'panCard' | 'aadhaarCard') => {
    if (e.target.files && e.target.files[0]) {
      setFiles({
        ...files,
        [docType]: e.target.files[0],
      });
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(path, file, {
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleUpdate = async () => {
    if (!currentUser) return;

    setEditLoading(true);

    try {
      let panCardUrl = profile?.pan_card_url || '';
      let aadhaarCardUrl = profile?.aadhaar_card_url || '';

      if (files.panCard) {
        panCardUrl = await uploadFile(
          files.panCard,
          `${currentUser.id}/panCard.${files.panCard.name.split('.').pop()}`
        );
      }

      if (files.aadhaarCard) {
        aadhaarCardUrl = await uploadFile(
          files.aadhaarCard,
          `${currentUser.id}/aadhaarCard.${files.aadhaarCard.name.split('.').pop()}`
        );
      }

      const { error: profileError } = await supabase
        .from('employee_profiles')
        .upsert({
          user_id: currentUser.id,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth || null,
          phone: formData.phone,
          alternate_contact: formData.alternateContact || null,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          emergency_contact_relationship: formData.emergencyContactRelationship,
          pan_card_url: panCardUrl || null,
          aadhaar_card_url: aadhaarCardUrl || null,
        });

      if (profileError) throw profileError;

      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: formData.fullName,
        })
        .eq('id', currentUser.id);

      if (userError) throw userError;

      toast({
        title: 'Profile updated successfully',
        status: 'success',
        duration: 3000,
      });

      await fetchProfile();
      onClose();
      setFiles({});
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setEditLoading(false);
    }
  };

  if (loading) {
    return <Layout>Loading...</Layout>;
  }

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">My Profile</Heading>
          <Button colorScheme="blue" onClick={onOpen}>
            Edit Profile
          </Button>
        </Box>

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md">Personal Details</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Full Name
                  </Text>
                  <Text>{profile?.full_name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Date of Birth
                  </Text>
                  <Text>
                    {profile?.date_of_birth
                      ? new Date(profile.date_of_birth).toLocaleDateString()
                      : 'Not provided'}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Phone
                  </Text>
                  <Text>{profile?.phone}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Alternate Contact
                  </Text>
                  <Text>{profile?.alternate_contact || 'Not provided'}</Text>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md">Emergency Contact</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Name
                  </Text>
                  <Text>{profile?.emergency_contact_name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Phone
                  </Text>
                  <Text>{profile?.emergency_contact_phone}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Relationship
                  </Text>
                  <Text>{profile?.emergency_contact_relationship}</Text>
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md">Documents</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    PAN Card
                  </Text>
                  {profile?.pan_card_url ? (
                    <Link href={profile.pan_card_url} isExternal color="blue.500">
                      View Document <ExternalLinkIcon mx="2px" />
                    </Link>
                  ) : (
                    <Text color="gray.500">Not uploaded</Text>
                  )}
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Aadhaar Card
                  </Text>
                  {profile?.aadhaar_card_url ? (
                    <Link href={profile.aadhaar_card_url} isExternal color="blue.500">
                      View Document <ExternalLinkIcon mx="2px" />
                    </Link>
                  ) : (
                    <Text color="gray.500">Not uploaded</Text>
                  )}
                </Box>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Heading size="sm" alignSelf="flex-start">
                Personal Details
              </Heading>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Full Name</FormLabel>
                  <Input name="fullName" value={formData.fullName} onChange={handleInputChange} />
                </FormControl>

                <FormControl>
                  <FormLabel>Date of Birth</FormLabel>
                  <Input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Phone</FormLabel>
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} />
                </FormControl>

                <FormControl>
                  <FormLabel>Alternate Contact</FormLabel>
                  <Input
                    name="alternateContact"
                    value={formData.alternateContact}
                    onChange={handleInputChange}
                  />
                </FormControl>
              </SimpleGrid>

              <Heading size="sm" alignSelf="flex-start" pt={4}>
                Emergency Contact
              </Heading>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="emergencyContactName"
                    value={formData.emergencyContactName}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    name="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={handleInputChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Relationship</FormLabel>
                  <Input
                    name="emergencyContactRelationship"
                    value={formData.emergencyContactRelationship}
                    onChange={handleInputChange}
                  />
                </FormControl>
              </SimpleGrid>

              <Heading size="sm" alignSelf="flex-start" pt={4}>
                Update Documents
              </Heading>
              <SimpleGrid columns={2} spacing={4} w="full">
                <FormControl>
                  <FormLabel>PAN Card</FormLabel>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'panCard')}
                    pt={1}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Aadhaar Card</FormLabel>
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, 'aadhaarCard')}
                    pt={1}
                  />
                </FormControl>
              </SimpleGrid>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleUpdate} isLoading={editLoading}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Layout>
  );
};

export default EmployeeProfile;
