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
  Badge,
  IconButton,
  Link,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { supabase } from '../../config/supabase';
import { getSecureDocumentUrl } from '../../utils/documentUrl';

interface EmployeeDocumentsTabProps {
  employeeId: string;
}

interface PersonalDocument {
  id: string;
  document_name: string;
  document_category: string | null;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

const EmployeeDocumentsTab: React.FC<EmployeeDocumentsTabProps> = ({ employeeId }) => {
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personal_documents')
        .select('*')
        .eq('user_id', employeeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching employee documents:', error);
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

  if (documents.length === 0) {
    return (
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <VStack spacing={2}>
            <Text color="whiteAlpha.700" fontSize="lg">No documents uploaded yet</Text>
            <Text color="whiteAlpha.500" fontSize="sm">
              The employee hasn't uploaded any documents like Aadhaar, PAN, certificates, etc.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card bg="rgba(255, 255, 255, 0.03)">
        <CardBody>
          <Heading size="sm" mb={4} color="white">
            Employee Uploaded Documents
          </Heading>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th color="whiteAlpha.700">Document Name</Th>
                  <Th color="whiteAlpha.700">Category</Th>
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
                    <Td>
                      {doc.document_category ? (
                        <Badge colorScheme="blue" variant="subtle">
                          {doc.document_category}
                        </Badge>
                      ) : (
                        <Text color="whiteAlpha.500">—</Text>
                      )}
                    </Td>
                    <Td color="whiteAlpha.700">{formatFileSize(doc.file_size)}</Td>
                    <Td color="whiteAlpha.700">{formatDate(doc.uploaded_at)}</Td>
                    <Td>
                      <IconButton
                        aria-label="View document"
                        icon={<ExternalLinkIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="brand"
                        onClick={() => handleViewDocument(doc.file_path)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          <Text fontSize="xs" color="whiteAlpha.500" mt={4}>
            * HR cannot delete employee-uploaded documents. These are maintained for compliance purposes.
          </Text>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default EmployeeDocumentsTab;
