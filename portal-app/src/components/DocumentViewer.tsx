import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  HStack,
  useToast,
  Spinner,
  Center,
  Text,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { supabase, supabaseUrl, supabaseAnonKey } from '../config/supabase';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ isOpen, onClose, filePath, fileName }) => {
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    if (isOpen && filePath) {
      loadDocument();
    }
    return () => {
      if (documentUrl) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [isOpen, filePath]);

  const loadDocument = async () => {
    setLoading(true);
    setError('');

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${supabaseUrl}/functions/v1/document-proxy?bucket=documents&path=${encodeURIComponent(filePath)}&token=${token}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document fetch error:', errorText);
        throw new Error(`Failed to load document: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      setDocumentUrl(objectUrl);
    } catch (err: any) {
      console.error('Error loading document:', err);
      setError(err.message || 'Failed to load document');
      toast({
        title: 'Error loading document',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      const url = `${supabaseUrl}/functions/v1/document-proxy?bucket=documents&path=${encodeURIComponent(filePath)}&token=${token}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Document download error:', errorText);
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || filePath.split('/').pop() || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: 'Document downloaded',
        status: 'success',
        duration: 3000,
      });
    } catch (err: any) {
      toast({
        title: 'Error downloading document',
        description: err.message,
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent bg="#1a1a1a" borderColor="rgba(255, 255, 255, 0.1)" maxH="90vh">
        <ModalHeader color="white">
          <HStack justify="space-between">
            <Text>{fileName || 'Document Viewer'}</Text>
            <Button
              leftIcon={<DownloadIcon />}
              size="sm"
              variant="gradient"
              onClick={handleDownload}
              isDisabled={loading || !!error}
            >
              Download
            </Button>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody pb={6}>
          {loading && (
            <Center h="500px">
              <Spinner size="xl" color="brand.400" />
            </Center>
          )}
          {error && (
            <Center h="500px">
              <Text color="red.400">{error}</Text>
            </Center>
          )}
          {!loading && !error && documentUrl && (
            <iframe
              src={documentUrl}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none',
                borderRadius: '8px',
              }}
              title="Document Viewer"
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default DocumentViewer;
