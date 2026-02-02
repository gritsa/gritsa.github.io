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
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import type { EmploymentType } from '../../types';

interface HRTabProps {
  employeeId: string;
  onUpdate: () => void;
}

const HRTab: React.FC<HRTabProps> = ({ employeeId, onUpdate }) => {
  const [profile, setProfile] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
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

  // Helper function to get manager name
  const getManagerName = () => {
    const manager = managers.find(m => m.id === formData.managerId);
    return manager ? (manager.display_name || manager.email) : 'Not assigned';
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Personal Information */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Personal Information</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Full Name</Text>
              <Text color="white" fontWeight="medium">{formData.fullName || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Email</Text>
              <Text color="white" fontWeight="medium">{formData.email || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Phone</Text>
              <Text color="white" fontWeight="medium">{formData.phone || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Alternate Contact</Text>
              <Text color="white" fontWeight="medium">{formData.alternateContact || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Date of Birth</Text>
              <Text color="white" fontWeight="medium">{formData.dateOfBirth || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Joining Date</Text>
              <Text color="white" fontWeight="medium">{formData.joiningDate || '—'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Employment Details */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Employment Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Employee ID</Text>
              <Text color="white" fontWeight="medium">{formData.employeeId || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Department</Text>
              <Text color="white" fontWeight="medium">{formData.department || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Designation</Text>
              <Text color="white" fontWeight="medium">{formData.designation || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Employment Type</Text>
              <Text color="white" fontWeight="medium">{formData.employmentType || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Reporting Manager</Text>
              <Text color="white" fontWeight="medium">{getManagerName()}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Emergency Contact */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Emergency Contact</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Contact Name</Text>
              <Text color="white" fontWeight="medium">{formData.emergencyContactName || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Contact Phone</Text>
              <Text color="white" fontWeight="medium">{formData.emergencyContactPhone || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Relationship</Text>
              <Text color="white" fontWeight="medium">{formData.emergencyContactRelationship || '—'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Identity Documents */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Identity Documents</Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>PAN Card URL</Text>
              <Text color="white" fontWeight="medium" wordBreak="break-all">{formData.panCardUrl || '—'}</Text>
            </Box>
            <Box>
              <Text fontSize="xs" color="whiteAlpha.600" mb={1}>Aadhaar Card URL</Text>
              <Text color="white" fontWeight="medium" wordBreak="break-all">{formData.aadhaarCardUrl || '—'}</Text>
            </Box>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Bank Details */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Bank Details</Heading>
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
        </CardBody>
      </Card>
    </VStack>
  );
};

export default HRTab;
