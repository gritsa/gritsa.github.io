import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  Text,
  Checkbox,
  CheckboxGroup,
  Stack,
} from '@chakra-ui/react';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Project {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  project_ids?: string[];
}

const ProjectManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  const [assignedEmployees, setAssignedEmployees] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('name');

      if (projectsError) throw projectsError;

      if (projectsData) {
        setProjects(projectsData);
      }

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('email');

      if (usersError) throw usersError;

      if (usersData) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setFormData({
      name: '',
      description: '',
      is_active: true,
    });
    setAssignedEmployees([]);
    onOpen();
  };

  const handleEditProject = async (project: Project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      is_active: project.is_active,
    });

    const usersWithProject = users.filter((u) => u.project_ids?.includes(project.id));
    setAssignedEmployees(usersWithProject.map((u) => u.id));

    onOpen();
  };

  const handleSaveProject = async () => {
    if (!currentUser) return;

    setLoading(true);

    try {
      let projectId = selectedProject?.id;

      if (selectedProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
          })
          .eq('id', selectedProject.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            name: formData.name,
            description: formData.description,
            is_active: formData.is_active,
            created_by: currentUser.id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        projectId = data.id;
      }

      // Update user project assignments
      for (const user of users) {
        const currentProjects = user.project_ids || [];
        let updatedProjects = [...currentProjects];

        if (assignedEmployees.includes(user.id)) {
          if (!updatedProjects.includes(projectId!)) {
            updatedProjects.push(projectId!);
          }
        } else {
          updatedProjects = updatedProjects.filter((id) => id !== projectId);
        }

        if (JSON.stringify(currentProjects) !== JSON.stringify(updatedProjects)) {
          const { error } = await supabase
            .from('users')
            .update({
              project_ids: updatedProjects,
            })
            .eq('id', user.id);

          if (error) throw error;
        }
      }

      toast({
        title: selectedProject ? 'Project updated' : 'Project created',
        status: 'success',
        duration: 3000,
      });

      await fetchData();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error saving project',
        description: error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getAssignedEmployees = (projectId: string) => {
    return users.filter((u) => u.project_ids?.includes(projectId));
  };

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Text fontSize="lg" fontWeight="bold">
            All Projects ({projects.length})
          </Text>
          <Button colorScheme="blue" onClick={handleCreateProject}>
            Create Project
          </Button>
        </Box>

        <Box overflowX="auto">
          <Table>
            <Thead>
              <Tr>
                <Th>Project Name</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th>Assigned Employees</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {projects.map((project) => (
                <Tr key={project.id}>
                  <Td fontWeight="bold">{project.name}</Td>
                  <Td>{project.description || '-'}</Td>
                  <Td>
                    <Badge colorScheme={project.is_active ? 'green' : 'gray'}>
                      {project.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  <Td>{getAssignedEmployees(project.id).length} employees</Td>
                  <Td>
                    <Button size="sm" onClick={() => handleEditProject(project)}>
                      Edit
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{selectedProject ? 'Edit Project' : 'Create Project'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Project Name</FormLabel>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <Checkbox
                  isChecked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                >
                  Active
                </Checkbox>
              </FormControl>

              <FormControl>
                <FormLabel>Assign Employees</FormLabel>
                <Box maxH="200px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md" p={3}>
                  <CheckboxGroup value={assignedEmployees} onChange={(values) => setAssignedEmployees(values as string[])}>
                    <Stack spacing={2}>
                      {users.map((user) => (
                        <Checkbox key={user.id} value={user.id}>
                          {user.email} ({user.role})
                        </Checkbox>
                      ))}
                    </Stack>
                  </CheckboxGroup>
                </Box>
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveProject} isLoading={loading}>
              {selectedProject ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ProjectManagement;
