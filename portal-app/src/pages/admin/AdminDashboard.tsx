import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import {
  Box,
  Heading,
  VStack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { Layout } from '../../components/Layout';
import UserManagement from './UserManagement';
import ProjectManagement from './ProjectManagement';
import OrgChart from './OrgChart';
import TimesheetReview from './TimesheetReview';
import HolidayManagement from './HolidayManagement';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (index: number) => {
    setTabIndex(index);
    const paths = ['users', 'projects', 'org-chart', 'timesheets', 'holidays'];
    navigate(`/admin/${paths[index]}`);
  };

  return (
    <Layout>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Administration</Heading>

        <Routes>
          <Route
            path="/"
            element={
              <Box>
                <Tabs index={tabIndex} onChange={handleTabChange} colorScheme="blue">
                  <TabList>
                    <Tab>User Management</Tab>
                    <Tab>Project Management</Tab>
                    <Tab>Org Chart</Tab>
                    <Tab>Timesheets</Tab>
                    <Tab>Holidays</Tab>
                  </TabList>

                  <TabPanels>
                    <TabPanel>
                      <UserManagement />
                    </TabPanel>
                    <TabPanel>
                      <ProjectManagement />
                    </TabPanel>
                    <TabPanel>
                      <OrgChart />
                    </TabPanel>
                    <TabPanel>
                      <TimesheetReview />
                    </TabPanel>
                    <TabPanel>
                      <HolidayManagement />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Box>
            }
          />
          <Route path="users" element={<Navigate to="/admin" replace />} />
          <Route path="projects" element={<Navigate to="/admin" replace />} />
          <Route path="org-chart" element={<Navigate to="/admin" replace />} />
          <Route path="timesheets" element={<Navigate to="/admin" replace />} />
          <Route path="holidays" element={<Navigate to="/admin" replace />} />
        </Routes>
      </VStack>
    </Layout>
  );
};

export default AdminDashboard;
