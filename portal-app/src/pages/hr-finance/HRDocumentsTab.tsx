import React, { useState, useEffect } from 'react';
import {
  VStack,
  Box,
  Text,
  useToast,
  Card,
  CardBody,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Link,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  HStack,
} from '@chakra-ui/react';
import { AddIcon, ExternalLinkIcon, DeleteIcon } from '@chakra-ui/icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getSecureDocumentUrl } from '../../utils/documentUrl';

interface HRDocumentsTabProps {
  employeeId: string;
}

interface EmployeeDocument {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  financial_year: string | null;
  uploaded_by: string;
  uploaded_at: string;
}

const HRDocumentsTab: React.FC<HRDocumentsTabProps> = ({ employeeId }) => {
  const { currentUser } = useAuth();
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [uploadForm, setUploadForm] = useState({
    documentName: '',
    documentType: '',
    file: null as File | null,
  });

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching HR documents:', error);
      toast({
        title: 'Error fetching documents',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.documentName || !uploadForm.documentType) {
      toast({
        title: 'Missing information',
        description: 'Please fill all fields and select a file',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `${employeeId}/${timestamp}_${uploadForm.documentName.replace(/[^a-z0-9]/gi, '_')}.${fileExt}`;
      const filePath = `hr-documents/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadForm.file);

      if (uploadError) throw uploadError;

      // Insert document record
      const { error: insertError } = await supabase
        .from('employee_documents')
        .insert({
          employee_id: employeeId,
          document_type: uploadForm.documentType,
          document_name: uploadForm.documentName,
          file_path: filePath,
          file_size: uploadForm.file.size,
          uploaded_by: currentUser?.id,
        });

      if (insertError) throw insertError;

      toast({
        title: 'Document uploaded successfully',
        status: 'success',
        duration: 3000,
      });

      // Reset form and close modal
      setUploadForm({ documentName: '', documentType: '', file: null });
      onClose();
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error uploading document',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.document_name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('employee_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast({
        title: 'Document deleted successfully',
        status: 'success',
        duration: 3000,
      });

      fetchDocuments();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error deleting document',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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

  if (loading) {
    return (
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Text color="whiteAlpha.700">Loading documents...</Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <HStack justify="space-between" mb={4}>
            <Heading size="sm" color="white">
              HR Issued Documents
            </Heading>
            <Button
              leftIcon={<AddIcon />}
              variant="gradient"
              size="sm"
              onClick={onOpen}
            >
              Upload Document
            </Button>
          </HStack>

          {documents.length === 0 ? (
            <VStack spacing={2} py={8}>
              <Text color="whiteAlpha.700" fontSize="lg">No documents uploaded yet</Text>
              <Text color="whiteAlpha.500" fontSize="sm">
                Upload offer letters, certificates, or other official documents for this employee
              </Text>
            </VStack>
          ) : (
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.700">Document Name</Th>
                    <Th color="whiteAlpha.700">Type</Th>
                    <Th color="whiteAlpha.700">File Size</Th>
                    <Th color="whiteAlpha.700">Uploaded Date</Th>
                    <Th color="whiteAlpha.700">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {documents.map((doc) => (
                    <Tr key={doc.id}>
                      <Td color="white">
                        <Text fontWeight="medium">{doc.document_name}</Text>
                      </Td>
                      <Td color="whiteAlpha.700">{doc.document_type}</Td>
                      <Td color="whiteAlpha.700">{formatFileSize(doc.file_size)}</Td>
                      <Td color="whiteAlpha.700">{formatDate(doc.uploaded_at)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <IconButton
                            aria-label="View document"
                            icon={<ExternalLinkIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="brand"
                            onClick={() => handleViewDocument(doc.file_path)}
                          />
                          <IconButton
                            aria-label="Delete document"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDelete(doc)}
                          />
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </CardBody>
      </Card>

      {/* Upload Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent bg="#1a1a1a" borderColor="rgba(255, 255, 255, 0.1)">
          <ModalHeader color="white">Upload Document</ModalHeader>
          <ModalCloseButton color="white" />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Document Name</FormLabel>
                <Input
                  placeholder="e.g., Offer Letter, Relieving Letter"
                  value={uploadForm.documentName}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                  color="white"
                  variant="filled"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Document Type</FormLabel>
                <Input
                  placeholder="e.g., Offer Letter, Certificate, Policy"
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                  color="white"
                  variant="filled"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel color="whiteAlpha.900">Select File</FormLabel>
                <Input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  color="white"
                  variant="filled"
                  pt={1}
                />
                <Text fontSize="xs" color="whiteAlpha.500" mt={2}>
                  Supported formats: Images, PDF, Word documents
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color="white">
              Cancel
            </Button>
            <Button
              variant="gradient"
              onClick={handleUpload}
              isLoading={uploading}
            >
              Upload
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default HRDocumentsTab;
