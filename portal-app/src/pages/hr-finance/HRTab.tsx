import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
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
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [managers, setManagers] = useState<any[]>([]);
  const toast = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    designation: '',
    employmentType: '' as EmploymentType | '',
    managerId: '',
    dateOfBirth: '',
    joiningDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
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
        designation: profileData?.designation || '',
        employmentType: (profileData?.employment_type as EmploymentType) || '',
        managerId: userData?.manager_id || '',
        dateOfBirth: profileData?.date_of_birth || '',
        joiningDate: profileData?.joining_date || '',
        emergencyContactName: profileData?.emergency_contact_name || '',
        emergencyContactPhone: profileData?.emergency_contact_phone || '',
        emergencyContactRelationship: profileData?.emergency_contact_relationship || '',
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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

  return (
    <VStack spacing={6} align="stretch">
      {/* Employee Profile */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Employee Profile</Heading>
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

      {/* Employment Details */}
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">Employment Details</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
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
