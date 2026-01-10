import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  useToast,
  Container,
  Card,
  CardBody,
  SimpleGrid,
  Text,
  Progress,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeProfile } from '../types';

const CompleteProfile: React.FC = () => {
  const { currentUser, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setLoading(true);
    setUploadProgress(10);

    try {
      let panCardUrl = '';
      let aadhaarCardUrl = '';

      if (files.panCard) {
        setUploadProgress(30);
        panCardUrl = await uploadFile(
          files.panCard,
          `documents/${currentUser.uid}/panCard`
        );
      }

      if (files.aadhaarCard) {
        setUploadProgress(60);
        aadhaarCardUrl = await uploadFile(
          files.aadhaarCard,
          `documents/${currentUser.uid}/aadhaarCard`
        );
      }

      setUploadProgress(80);

      const profileData: Partial<EmployeeProfile> = {
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

      await setDoc(doc(db, 'employeeProfiles', currentUser.uid), profileData);

      await setDoc(
        doc(db, 'users', currentUser.uid),
        { profileCompleted: true, displayName: formData.fullName },
        { merge: true }
      );

      setUploadProgress(100);

      await refreshUserData();

      toast({
        title: 'Profile completed successfully',
        status: 'success',
        duration: 3000,
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Error completing profile',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Container maxW="2xl" py={10}>
      <Card>
        <CardBody>
          <VStack spacing={6} align="stretch">
            <Heading size="lg">Complete Your Profile</Heading>
            <Text color="gray.600">
              Please provide your details to continue using the portal
            </Text>

            {loading && uploadProgress > 0 && (
              <Progress value={uploadProgress} colorScheme="blue" />
            )}

            <form onSubmit={handleSubmit}>
              <VStack spacing={6}>
                <Heading size="md" alignSelf="flex-start">
                  Personal Details
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                    />
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
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
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

                <Heading size="md" alignSelf="flex-start" pt={4}>
                  Emergency Contact
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
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
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  </FormControl>
                </SimpleGrid>

                <Heading size="md" alignSelf="flex-start" pt={4}>
                  Documents
                </Heading>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
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

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  isLoading={loading}
                  mt={6}
                >
                  Complete Profile
                </Button>
              </VStack>
            </form>
          </VStack>
        </CardBody>
      </Card>
    </Container>
  );
};

export default CompleteProfile;
