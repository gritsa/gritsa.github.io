import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
} from '@chakra-ui/react';
import PolicyEditor from './PolicyEditor';
import type { Policy } from '../types';

interface PolicyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy | null; // null => creating a new policy
  saving: boolean;
  onSave: (title: string, content: string) => void;
}

// Keyed by the parent on `${isOpen}-${policy?.id || 'new'}` so each fresh open remounts this
// component with the right initial values — avoids resetting form state from inside an effect.
const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({ isOpen, onClose, policy, saving, onSave }) => {
  const [title, setTitle] = useState(policy?.title || '');
  const [content, setContent] = useState(policy?.content || '');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: '4xl' }}>
      <ModalOverlay />
      <ModalContent bg="#1a1a1a" borderColor="whiteAlpha.200">
        <ModalHeader color="white">{policy ? 'Edit Policy' : 'New Policy'}</ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Title</FormLabel>
              <Input
                variant="filled"
                color="white"
                placeholder="e.g., Code of Conduct"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel color="whiteAlpha.900">Content</FormLabel>
              <PolicyEditor content={content} onChange={setContent} />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" color="white" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="gradient"
            isLoading={saving}
            isDisabled={!title.trim()}
            onClick={() => onSave(title.trim(), content)}
          >
            Save Policy
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PolicyEditorModal;
