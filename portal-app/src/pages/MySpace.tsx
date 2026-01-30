import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  SimpleGrid,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Select,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { DownloadIcon, ViewIcon } from '@chakra-ui/icons';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import type { Payslip, EmployeeDocument } from '../types';

interface ProfileFormData {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  alternateContact: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  upiId: string;
  panCardFile: File | null;
  aadhaarCardFile: File | null;
}

const MySpace: React.FC = () => {
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const toast = useToast();

  const [formData, setFormData] = useState<ProfileFormData>({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    alternateContact: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
    bankName: '',
    ifscCode: '',
    accountNumber: '',
    upiId: '',
    panCardFile: null,
    aadhaarCardFile: null,
  });

  useEffect(() => {
    fetchProfile();
    fetchPayslips();
    fetchDocuments();
  }, [currentUser]);

  const fetchProfile = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
        setFormData({
          fullName: data.full_name || '',
          dateOfBirth: data.date_of_birth || '',
          phone: data.phone || '',
          alternateContact: data.alternate_contact || '',
          emergencyContactName: data.emergency_contact_name || '',
          emergencyContactPhone: data.emergency_contact_phone || '',
          emergencyContactRelationship: data.emergency_contact_relationship || '',
          bankName: data.bank_name || '',
          ifscCode: data.ifsc_code || '',
          accountNumber: data.account_number || '',
          upiId: data.upi_id || '',
          panCardFile: null,
          aadhaarCardFile: null,
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPayslips = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('payslips')
        .select('*')
        .eq('employee_id', currentUser.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      setPayslips(data || []);
    } catch (error: any) {
      console.error('Error fetching payslips:', error);
    }
  };

  const fetchDocuments = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', currentUser.id)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        [fieldName]: file,
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      let panCardUrl = profile?.pan_card_url;
      let aadhaarCardUrl = profile?.aadhaar_card_url;

      // Upload PAN card if new file selected
      if (formData.panCardFile) {
        const fileName = `${currentUser.id}/${Date.now()}_pan.${formData.panCardFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, formData.panCardFile);

        if (uploadError) throw uploadError;
        panCardUrl = fileName;
      }

      // Upload Aadhaar card if new file selected
      if (formData.aadhaarCardFile) {
        const fileName = `${currentUser.id}/${Date.now()}_aadhaar.${formData.aadhaarCardFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, formData.aadhaarCardFile);

        if (uploadError) throw uploadError;
        aadhaarCardUrl = fileName;
      }

      const profileData = {
        user_id: currentUser.id,
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth || null,
        phone: formData.phone,
        alternate_contact: formData.alternateContact || null,
        emergency_contact_name: formData.emergencyContactName,
        emergency_contact_phone: formData.emergencyContactPhone,
        emergency_contact_relationship: formData.emergencyContactRelationship,
        bank_name: formData.bankName || null,
        ifsc_code: formData.ifscCode || null,
        account_number: formData.accountNumber || null,
        account_name: formData.fullName, // Auto-set to full name
        upi_id: formData.upiId || null,
        pan_card_url: panCardUrl,
        aadhaar_card_url: aadhaarCardUrl,
      };

      const { error } = await supabase
        .from('employee_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Profile updated successfully',
        status: 'success',
        duration: 3000,
      });

      await fetchProfile();
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

  const viewDocument = async (filePath: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        toast({
          title: 'Authentication required',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-proxy?bucket=documents&path=${filePath}`;
      window.open(url + `&token=${token}`, '_blank');
    } catch (error: any) {
      toast({
        title: 'Error viewing document',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const downloadPayslip = (payslip: Payslip) => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: 'Popup blocked',
        description: 'Please allow popups to download payslip',
        status: 'error',
        duration: 5000,
      });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${monthNames[payslip.month - 1]} ${payslip.year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            h1 { color: #333; text-align: center; }
            .info { margin-bottom: 30px; }
            .info p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #667eea; color: white; }
            .total { background-color: #f0f0f0; font-weight: bold; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Payslip for ${monthNames[payslip.month - 1]} ${payslip.year}</h1>
          <div class="info">
            <p><strong>Employee Name:</strong> ${userData?.displayName || userData?.email}</p>
            <p><strong>Month:</strong> ${monthNames[payslip.month - 1]} ${payslip.year}</p>
            <p><strong>Status:</strong> ${payslip.status}</p>
          </div>
          <table>
            <tr>
              <th>Description</th>
              <th>Amount (₹)</th>
            </tr>
            <tr>
              <td>Gross Salary</td>
              <td>${payslip.gross_salary.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Total Deductions</td>
              <td>${payslip.total_deductions.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Net Salary</td>
              <td>${payslip.net_salary.toFixed(2)}</td>
            </tr>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 100);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredDocuments = documents.filter(doc =>
    !doc.financial_year || doc.financial_year.includes(selectedYear.toString())
  );

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg" color="white">My Space</Heading>

        <Tabs variant="enclosed" colorScheme="brand">
          <TabList>
            <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
              Profile
            </Tab>
            <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
              Payroll
            </Tab>
            <Tab color="whiteAlpha.700" _selected={{ color: 'white', bg: 'rgba(255, 255, 255, 0.1)' }}>
              Documents
            </Tab>
          </TabList>

          <TabPanels>
            {/* Profile Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                {/* Employment Details - Read Only */}
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="md" mb={4} color="white">Employment Details</Heading>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <Box>
                        <Text fontSize="sm" color="whiteAlpha.600">Designation</Text>
                        <Text color="white" fontWeight="medium">
                          {profile?.designation || 'Not Set'}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="whiteAlpha.600">Employment Type</Text>
                        <Text color="white" fontWeight="medium">
                          {profile?.employment_type || 'Not Set'}
                        </Text>
                      </Box>
                      <Box>
                        <Text fontSize="sm" color="whiteAlpha.600">Reporting Manager</Text>
                        <Text color="white" fontWeight="medium">
                          {userData?.managerId ? 'Assigned' : 'Not Assigned'}
                        </Text>
                      </Box>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Personal Details */}
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="md" mb={4} color="white">Personal Information</Heading>
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
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Emergency Contact */}
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="md" mb={4} color="white">Emergency Contact</Heading>
                    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="whiteAlpha.900">Name</FormLabel>
                        <Input
                          variant="filled"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleInputChange}
                          color="white"
                        />
                      </FormControl>

                      <FormControl isRequired>
                        <FormLabel color="whiteAlpha.900">Phone</FormLabel>
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
                          color="white"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Banking Information */}
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="md" mb={4} color="white">Banking Information</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel color="whiteAlpha.900">Bank Name</FormLabel>
                        <Input
                          variant="filled"
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleInputChange}
                          placeholder="e.g., HDFC Bank"
                          color="white"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel color="whiteAlpha.900">IFSC Code</FormLabel>
                        <Input
                          variant="filled"
                          name="ifscCode"
                          value={formData.ifscCode}
                          onChange={handleInputChange}
                          placeholder="e.g., HDFC0001234"
                          color="white"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel color="whiteAlpha.900">Account Number</FormLabel>
                        <Input
                          variant="filled"
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                          color="white"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel color="whiteAlpha.900">UPI ID</FormLabel>
                        <Input
                          variant="filled"
                          name="upiId"
                          value={formData.upiId}
                          onChange={handleInputChange}
                          placeholder="e.g., 9876543210@okicici"
                          color="white"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                {/* Document Uploads */}
                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    <Heading size="md" mb={4} color="white">Identity Documents</Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel color="whiteAlpha.900">PAN Card</FormLabel>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(e, 'panCardFile')}
                          sx={{
                            '::file-selector-button': {
                              bg: 'brand.500',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'md',
                              padding: '8px 16px',
                              cursor: 'pointer',
                              mr: 2,
                            },
                          }}
                        />
                        {profile?.pan_card_url && (
                          <Text fontSize="sm" color="green.400" mt={2}>
                            ✓ Document uploaded
                          </Text>
                        )}
                      </FormControl>

                      <FormControl>
                        <FormLabel color="whiteAlpha.900">Aadhaar Card</FormLabel>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFileChange(e, 'aadhaarCardFile')}
                          sx={{
                            '::file-selector-button': {
                              bg: 'brand.500',
                              color: 'white',
                              border: 'none',
                              borderRadius: 'md',
                              padding: '8px 16px',
                              cursor: 'pointer',
                              mr: 2,
                            },
                          }}
                        />
                        {profile?.aadhaar_card_url && (
                          <Text fontSize="sm" color="green.400" mt={2}>
                            ✓ Document uploaded
                          </Text>
                        )}
                      </FormControl>
                    </SimpleGrid>
                  </CardBody>
                </Card>

                <Button
                  variant="gradient"
                  onClick={handleSaveProfile}
                  isLoading={loading}
                  size="lg"
                >
                  Save Profile
                </Button>
              </VStack>
            </TabPanel>

            {/* Payroll Tab */}
            <TabPanel>
              <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                <CardBody>
                  <Heading size="md" mb={4} color="white">My Payslips</Heading>
                  {payslips.length === 0 ? (
                    <Text color="whiteAlpha.700">No payslips available yet</Text>
                  ) : (
                    <Table size="sm">
                      <Thead>
                        <Tr>
                          <Th color="whiteAlpha.700">Month</Th>
                          <Th color="whiteAlpha.700">Year</Th>
                          <Th color="whiteAlpha.700">Gross Salary</Th>
                          <Th color="whiteAlpha.700">Net Salary</Th>
                          <Th color="whiteAlpha.700">Status</Th>
                          <Th color="whiteAlpha.700">Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {payslips.map((payslip) => (
                          <Tr key={payslip.id}>
                            <Td color="white">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][payslip.month - 1]}</Td>
                            <Td color="white">{payslip.year}</Td>
                            <Td color="white">₹{payslip.gross_salary.toFixed(2)}</Td>
                            <Td color="white">₹{payslip.net_salary.toFixed(2)}</Td>
                            <Td>
                              <Badge colorScheme={payslip.status === 'Paid' ? 'green' : payslip.status === 'Submitted' ? 'blue' : 'yellow'}>
                                {payslip.status}
                              </Badge>
                            </Td>
                            <Td>
                              <IconButton
                                aria-label="Download payslip"
                                icon={<DownloadIcon />}
                                size="sm"
                                variant="ghost"
                                color="brand.400"
                                onClick={() => downloadPayslip(payslip)}
                              />
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  )}
                </CardBody>
              </Card>
            </TabPanel>

            {/* Documents Tab */}
            <TabPanel>
              <VStack spacing={6} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md" color="white">HR Documents</Heading>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    maxW="150px"
                    variant="filled"
                    color="white"
                  >
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <option key={year} value={year}>FY {year}-{(year + 1).toString().slice(2)}</option>
                    ))}
                  </Select>
                </HStack>

                <Card bg="rgba(255, 255, 255, 0.05)" borderColor="rgba(255, 255, 255, 0.1)">
                  <CardBody>
                    {filteredDocuments.length === 0 ? (
                      <Text color="whiteAlpha.700">No documents available for selected year</Text>
                    ) : (
                      <Table size="sm">
                        <Thead>
                          <Tr>
                            <Th color="whiteAlpha.700">Document Name</Th>
                            <Th color="whiteAlpha.700">Type</Th>
                            <Th color="whiteAlpha.700">Uploaded Date</Th>
                            <Th color="whiteAlpha.700">Actions</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {filteredDocuments.map((doc) => (
                            <Tr key={doc.id}>
                              <Td color="white">{doc.document_name}</Td>
                              <Td color="white">{doc.document_type}</Td>
                              <Td color="white">{new Date(doc.uploaded_at).toLocaleDateString()}</Td>
                              <Td>
                                <IconButton
                                  aria-label="View document"
                                  icon={<ViewIcon />}
                                  size="sm"
                                  variant="ghost"
                                  color="brand.400"
                                  onClick={() => viewDocument(doc.file_path)}
                                />
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    )}
                  </CardBody>
                </Card>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Layout>
  );
};

export default MySpace;
