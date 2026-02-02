import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  SimpleGrid,
  Text,
  useToast,
  Card,
  CardBody,
  Heading,
  Link,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { supabase } from '../../config/supabase';
import type { EmploymentType } from '../../types';
import { getSecureDocumentUrl } from '../../utils/documentUrl';

interface HRTabProps {
  employeeId: string;
  onUpdate: () => void;
}

const HRTab: React.FC<HRTabProps> = ({ employeeId, onUpdate }) => {
  const [profile, setProfile] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    alternateContact: '',
    employeeId: '',
    department: '',
    designation: '',
    employmentType: '' as EmploymentType | '',
    managerId: '',
    dateOfBirth: '',
    joiningDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    panCardUrl: '',
    aadhaarCardUrl: '',
    bankName: '',
    ifscCode: '',
    accountNumber: '',
    accountName: '',
    upiId: '',
  });

  useEffect(() => {
    fetchProfile();
    fetchManagers();
  }, [employeeId]);

  const fetchProfile = async () => {
    try {
      // Fetch user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (userError) throw userError;

      // Fetch employee profile
      const { data: profileData, error: profileError } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', employeeId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      setProfile({ ...userData, ...profileData });

      setFormData({
        fullName: profileData?.full_name || '',
        email: userData?.email || '',
        phone: profileData?.phone || '',
        alternateContact: profileData?.alternate_contact || '',
        employeeId: profileData?.employee_id || '',
        department: profileData?.department || '',
        designation: profileData?.designation || '',
        employmentType: (profileData?.employment_type as EmploymentType) || '',
        managerId: userData?.manager_id || '',
        dateOfBirth: profileData?.date_of_birth || '',
        joiningDate: profileData?.joining_date || '',
        emergencyContactName: profileData?.emergency_contact_name || '',
        emergencyContactPhone: profileData?.emergency_contact_phone || '',
        emergencyContactRelationship: profileData?.emergency_contact_relationship || '',
        panCardUrl: profileData?.pan_card_url || '',
        aadhaarCardUrl: profileData?.aadhaar_card_url || '',
        bankName: profileData?.bank_name || '',
        ifscCode: profileData?.ifsc_code || '',
        accountNumber: profileData?.account_number || '',
        accountName: profileData?.account_name || '',
        upiId: profileData?.upi_id || '',
      });
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error fetching profile',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name')
        .in('role', ['Manager', 'Administrator'])
        .order('display_name', { ascending: true });

      if (error) throw error;
      setManagers(data || []);
    } catch (error: any) {
      console.error('Error fetching managers:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Handle save
  const handleSave = async () => {
    setLoading(true);

    try {
      // Update user table
      const { error: userError } = await supabase
        .from('users')
        .update({
          display_name: formData.fullName,
          manager_id: formData.managerId || null,
        })
        .eq('id', employeeId);

      if (userError) throw userError;

      // Update or insert employee profile
      const { error: profileError } = await supabase
        .from('employee_profiles')
        .upsert({
          user_id: employeeId,
          full_name: formData.fullName,
          phone: formData.phone,
          alternate_contact: formData.alternateContact,
          employee_id: formData.employeeId || null,
          department: formData.department || null,
          designation: formData.designation || null,
          employment_type: formData.employmentType || null,
          date_of_birth: formData.dateOfBirth || null,
          joining_date: formData.joiningDate || null,
          emergency_contact_name: formData.emergencyContactName,
          emergency_contact_phone: formData.emergencyContactPhone,
          emergency_contact_relationship: formData.emergencyContactRelationship,
        }, {
          onConflict: 'user_id',
        });

      if (profileError) throw profileError;

      toast({
        title: 'Profile updated successfully',
        status: 'success',
        duration: 3000,
      });

      await fetchProfile();
      onUpdate();
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get manager name
  const getManagerName = () => {
    const manager = managers.find(m => m.id === formData.managerId);
    return manager ? (manager.display_name || manager.email) : 'Not assigned';
  };

  // Handle viewing identity documents
  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await getSecureDocumentUrl(filePath);
      window.open(url, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error opening document',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Personal Information */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Personal Information</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Full Name</FormLabel>
              <Input
                variant="filled"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Email</FormLabel>
              <Input
                variant="filled"
                name="email"
                value={formData.email}
                isReadOnly
                color="white"
                bg="rgba(255, 255, 255, 0.03)"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Phone</FormLabel>
              <Input
                variant="filled"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Alternate Contact</FormLabel>
              <Input
                variant="filled"
                name="alternateContact"
                value={formData.alternateContact}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Date of Birth</FormLabel>
              <Input
                variant="filled"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Joining Date</FormLabel>
              <Input
                variant="filled"
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Employment Details */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Employment Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel color="whiteAlpha.900">Employee ID</FormLabel>
              <Input
                variant="filled"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleInputChange}
                placeholder="e.g., EMP001"
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Department</FormLabel>
              <Input
                variant="filled"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="e.g., Engineering"
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Designation</FormLabel>
              <Input
                variant="filled"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="e.g., Senior Software Engineer"
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Employment Type</FormLabel>
              <Select
                variant="filled"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleInputChange}
                color="white"
              >
                <option value="">Select Type</option>
                <option value="Intern">Intern</option>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Date of Joining</FormLabel>
              <Input
                variant="filled"
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl>
              <FormLabel color="whiteAlpha.900">Reporting Manager</FormLabel>
              <Select
                variant="filled"
                name="managerId"
                value={formData.managerId}
                onChange={handleInputChange}
                color="white"
              >
                <option value="">No Manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.display_name || manager.email}
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Emergency Contact */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Emergency Contact</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Contact Name</FormLabel>
              <Input
                variant="filled"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Contact Phone</FormLabel>
              <Input
                variant="filled"
                name="emergencyContactPhone"
                value={formData.emergencyContactPhone}
                onChange={handleInputChange}
                color="white"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Relationship</FormLabel>
              <Input
                variant="filled"
                name="emergencyContactRelationship"
                value={formData.emergencyContactRelationship}
                onChange={handleInputChange}
                placeholder="e.g., Spouse, Parent, Sibling"
                color="white"
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Identity Documents */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Identity Documents</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>PAN Card</Text>
              {formData.panCardUrl ? (
                <HStack spacing={2}>
                  <Link
                    color="brand.400"
                    fontWeight="medium"
                    onClick={() => handleViewDocument(formData.panCardUrl)}
                    cursor="pointer"
                    _hover={{ color: 'brand.300' }}
                  >
                    View Document
                  </Link>
                  <ExternalLinkIcon color="brand.400" />
                </HStack>
              ) : (
                <Text color="white" fontWeight="medium">—</Text>
              )}
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Aadhaar Card</Text>
              {formData.aadhaarCardUrl ? (
                <HStack spacing={2}>
                  <Link
                    color="brand.400"
                    fontWeight="medium"
                    onClick={() => handleViewDocument(formData.aadhaarCardUrl)}
                    cursor="pointer"
                    _hover={{ color: 'brand.300' }}
                  >
                    View Document
                  </Link>
                  <ExternalLinkIcon color="brand.400" />
                </HStack>
              ) : (
                <Text color="white" fontWeight="medium">—</Text>
              )}
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Bank Details - Read Only */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Bank Details (View Only)</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Bank Name</Text>
              <Text color="white" fontWeight="medium">{formData.bankName || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Account Name</Text>
              <Text color="white" fontWeight="medium">{formData.accountName || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Account Number</Text>
              <Text color="white" fontWeight="medium">{formData.accountNumber || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>IFSC Code</Text>
              <Text color="white" fontWeight="medium">{formData.ifscCode || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>UPI ID</Text>
              <Text color="white" fontWeight="medium">{formData.upiId || '—'}</Text>
            </Box>
          </SimpleGrid>
          <Text fontSize="xs" color="whiteAlpha.500" mt={4}>
            * Bank details can only be modified by the employee from their profile
          </Text>
        </CardBody>
      </Card>

      <Button
        variant="gradient"
        onClick={handleSave}
        isLoading={loading}
        size="lg"
      >
        Save Changes
      </Button>
    </VStack>
  );
};

export default HRTab;
