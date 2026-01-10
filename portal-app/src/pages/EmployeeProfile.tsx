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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { EmployeeProfile as EmployeeProfileType } from '../types';
import { ExternalLinkIcon } from '@chakra-ui/icons';

const EmployeeProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<EmployeeProfileType | null>(null);
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
      const profileDoc = await getDoc(doc(db, 'employeeProfiles', currentUser.uid));
      if (profileDoc.exists()) {
        const data = profileDoc.data() as EmployeeProfileType;
        setProfile(data);
        setFormData({
          fullName: data.personalDetails.fullName,
          dateOfBirth: data.personalDetails.dateOfBirth
            ? new Date(data.personalDetails.dateOfBirth).toISOString().split('T')[0]
            : '',
          phone: data.personalDetails.phone,
          alternateContact: data.personalDetails.alternateContact || '',
          emergencyContactName: data.personalDetails.emergencyContact.name,
          emergencyContactPhone: data.personalDetails.emergencyContact.phone,
          emergencyContactRelationship: data.personalDetails.emergencyContact.relationship,
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
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleUpdate = async () => {
    if (!currentUser) return;

    setEditLoading(true);

    try {
      let panCardUrl = profile?.documents.panCard || '';
      let aadhaarCardUrl = profile?.documents.aadhaarCard || '';

      if (files.panCard) {
        panCardUrl = await uploadFile(files.panCard, `documents/${currentUser.uid}/panCard`);
      }

      if (files.aadhaarCard) {
        aadhaarCardUrl = await uploadFile(files.aadhaarCard, `documents/${currentUser.uid}/aadhaarCard`);
      }

      const profileData: Partial<EmployeeProfileType> = {
        uid: currentUser.uid,
        personalDetails: {
          fullName: formData.fullName,
          dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
          phone: formData.phone,
          alternateContact: formData.alternateContact,
          emergencyContact: {
            name: formData.emergencyContactName,
            phone: formData.emergencyContactPhone,
            relationship: formData.emergencyContactRelationship,
          },
        },
        documents: {
          panCard: panCardUrl,
          aadhaarCard: aadhaarCardUrl,
        },
        updatedAt: serverTimestamp() as any,
      };

      await setDoc(doc(db, 'employeeProfiles', currentUser.uid), profileData, { merge: true });

      await setDoc(
        doc(db, 'users', currentUser.uid),
        { displayName: formData.fullName },
        { merge: true }
      );

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
                  <Text>{profile?.personalDetails.fullName}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Date of Birth
                  </Text>
                  <Text>
                    {profile?.personalDetails.dateOfBirth
                      ? new Date(profile.personalDetails.dateOfBirth).toLocaleDateString()
                      : 'Not provided'}
                  </Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Phone
                  </Text>
                  <Text>{profile?.personalDetails.phone}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Alternate Contact
                  </Text>
                  <Text>{profile?.personalDetails.alternateContact || 'Not provided'}</Text>
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
                  <Text>{profile?.personalDetails.emergencyContact.name}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Phone
                  </Text>
                  <Text>{profile?.personalDetails.emergencyContact.phone}</Text>
                </Box>
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="gray.600">
                    Relationship
                  </Text>
                  <Text>{profile?.personalDetails.emergencyContact.relationship}</Text>
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
                  {profile?.documents.panCard ? (
                    <Link href={profile.documents.panCard} isExternal color="blue.500">
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
                  {profile?.documents.aadhaarCard ? (
                    <Link href={profile.documents.aadhaarCard} isExternal color="blue.500">
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
