import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  VStack,
  HStack,
  Box,
} from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';

interface TimesheetDay {
  type: 'Full Day' | 'Half Day' | 'Leave';
  description: string;
}

interface TimesheetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: {
    employee_id: string;
    month: number;
    year: number;
    days: Record<number, TimesheetDay>;
    status: 'Draft' | 'Submitted';
  } | null;
  employeeName: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TimesheetDetailModal: React.FC<TimesheetDetailModalProps> = ({
  isOpen,
  onClose,
  timesheet,
  employeeName,
}) => {
  if (!timesheet) return null;

  const daysInMonth = new Date(timesheet.year, timesheet.month + 1, 0).getDate();
  const firstDayOfMonth = new Date(timesheet.year, timesheet.month, 1).getDay();

  const getDayOfWeek = (day: number) => {
    const date = new Date(timesheet.year, timesheet.month, day);
    return DAYS_OF_WEEK[date.getDay()];
  };

  const isWeekend = (day: number) => {
    const date = new Date(timesheet.year, timesheet.month, day);
    const dow = date.getDay();
    return dow === 0 || dow === 6;
  };

  const getDayTypeColor = (type: string) => {
    switch (type) {
      case 'Full Day': return 'green';
      case 'Half Day': return 'yellow';
      case 'Leave': return 'red';
      default: return 'gray';
    }
  };

  // Summary counts
  const fullDays = Object.values(timesheet.days).filter(d => d.type === 'Full Day').length;
  const halfDays = Object.values(timesheet.days).filter(d => d.type === 'Half Day').length;
  const leaveDays = Object.values(timesheet.days).filter(d => d.type === 'Leave').length;
  const totalWorked = fullDays + halfDays * 0.5;

  const handleDownloadCSV = () => {
    const rows = [
      ['Employee', employeeName],
      ['Month', `${MONTHS[timesheet.month]} ${timesheet.year}`],
      ['Status', timesheet.status],
      [''],
      ['Day', 'Date', 'Day of Week', 'Type', 'Description'],
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const entry = timesheet.days[day];
      const date = new Date(timesheet.year, timesheet.month, day);
      const dateStr = date.toLocaleDateString('en-IN');
      const dayOfWeek = getDayOfWeek(day);
      rows.push([
        String(day),
        dateStr,
        dayOfWeek,
        entry?.type || (isWeekend(day) ? 'Weekend' : '—'),
        entry?.description || '',
      ]);
    }

    rows.push(['']);
    rows.push(['Summary']);
    rows.push(['Full Days', String(fullDays)]);
    rows.push(['Half Days', String(halfDays)]);
    rows.push(['Leave Days', String(leaveDays)]);
    rows.push(['Total Days Worked', String(totalWorked)]);

    const csvContent = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timesheet_${employeeName.replace(/\s+/g, '_')}_${MONTHS[timesheet.month]}_${timesheet.year}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = () => {
    const printContent = `
      <html>
      <head>
        <title>Timesheet - ${employeeName} - ${MONTHS[timesheet.month]} ${timesheet.year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { font-size: 13px; color: #555; margin-bottom: 16px; }
          .summary { display: flex; gap: 24px; margin-bottom: 20px; padding: 12px; background: #f5f5f5; border-radius: 6px; }
          .summary-item { text-align: center; }
          .summary-label { font-size: 11px; color: #888; }
          .summary-value { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #333; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          .weekend { background: #f9f9f9; color: #aaa; }
          .leave { background: #fff5f5; }
          .half { background: #fffbf0; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-full { background: #c6f6d5; color: #276749; }
          .badge-half { background: #fefcbf; color: #744210; }
          .badge-leave { background: #fed7d7; color: #742a2a; }
          .badge-weekend { background: #e2e8f0; color: #4a5568; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Timesheet — ${employeeName}</h1>
        <div class="meta">${MONTHS[timesheet.month]} ${timesheet.year} &nbsp;|&nbsp; Status: ${timesheet.status}</div>
        <div class="summary">
          <div class="summary-item"><div class="summary-value">${fullDays}</div><div class="summary-label">Full Days</div></div>
          <div class="summary-item"><div class="summary-value">${halfDays}</div><div class="summary-label">Half Days</div></div>
          <div class="summary-item"><div class="summary-value">${leaveDays}</div><div class="summary-label">Leave Days</div></div>
          <div class="summary-item"><div class="summary-value">${totalWorked}</div><div class="summary-label">Days Worked</div></div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Date</th><th>Day</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>
            ${Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const entry = timesheet.days[day];
              const weekend = isWeekend(day);
              const rowClass = weekend ? 'weekend' : entry?.type === 'Leave' ? 'leave' : entry?.type === 'Half Day' ? 'half' : '';
              const badgeClass = weekend ? 'badge-weekend' : entry?.type === 'Full Day' ? 'badge-full' : entry?.type === 'Half Day' ? 'badge-half' : entry?.type === 'Leave' ? 'badge-leave' : '';
              const label: string = weekend ? 'Weekend' : entry?.type || '—';
              const date = new Date(timesheet.year, timesheet.month, day).toLocaleDateString('en-IN');
              return `<tr class="${rowClass}">
                <td>${day}</td>
                <td>${date}</td>
                <td>${getDayOfWeek(day)}</td>
                <td>${label !== '—' ? `<span class="badge ${badgeClass}">${label}</span>` : '—'}</td>
                <td>${entry?.description || ''}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
      win.print();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="#1a1a1a" borderColor="rgba(255,255,255,0.1)">
        <ModalHeader color="white">
          Timesheet — {employeeName}
          <Text fontSize="sm" color="whiteAlpha.600" fontWeight="normal">
            {MONTHS[timesheet.month]} {timesheet.year}
          </Text>
        </ModalHeader>
        <ModalCloseButton color="white" />

        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Summary */}
            <HStack spacing={6} p={4} bg="rgba(255,255,255,0.05)" borderRadius="lg">
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="green.300">{fullDays}</Text>
                <Text fontSize="xs" color="whiteAlpha.600">Full Days</Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="yellow.300">{halfDays}</Text>
                <Text fontSize="xs" color="whiteAlpha.600">Half Days</Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="red.300">{leaveDays}</Text>
                <Text fontSize="xs" color="whiteAlpha.600">Leave Days</Text>
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" color="white">{totalWorked}</Text>
                <Text fontSize="xs" color="whiteAlpha.600">Days Worked</Text>
              </Box>
              <Box ml="auto">
                <Badge colorScheme={timesheet.status === 'Submitted' ? 'green' : 'yellow'} fontSize="sm" p={2}>
                  {timesheet.status}
                </Badge>
              </Box>
            </HStack>

            {/* Day-by-day table */}
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="whiteAlpha.600">#</Th>
                    <Th color="whiteAlpha.600">Day</Th>
                    <Th color="whiteAlpha.600">Type</Th>
                    <Th color="whiteAlpha.600">Notes / Work Done</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const entry = timesheet.days[day];
                    const weekend = isWeekend(day);
                    const date = new Date(timesheet.year, timesheet.month, day);
                    return (
                      <Tr
                        key={day}
                        bg={weekend ? 'rgba(255,255,255,0.02)' : 'transparent'}
                        opacity={weekend && !entry ? 0.5 : 1}
                      >
                        <Td color="whiteAlpha.500" fontSize="xs">{day}</Td>
                        <Td color={weekend ? 'whiteAlpha.400' : 'whiteAlpha.800'} fontSize="sm">
                          {date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Td>
                        <Td>
                          {entry ? (
                            <Badge colorScheme={getDayTypeColor(entry.type)} variant="subtle">
                              {entry.type}
                            </Badge>
                          ) : weekend ? (
                            <Text fontSize="xs" color="whiteAlpha.400">Weekend</Text>
                          ) : (
                            <Text fontSize="xs" color="whiteAlpha.300">—</Text>
                          )}
                        </Td>
                        <Td color="whiteAlpha.700" fontSize="sm" maxW="300px">
                          <Text noOfLines={2}>{entry?.description || ''}</Text>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          </VStack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button
            leftIcon={<DownloadIcon />}
            variant="outline"
            colorScheme="brand"
            size="sm"
            onClick={handleDownloadCSV}
          >
            Download CSV
          </Button>
          <Button
            leftIcon={<DownloadIcon />}
            variant="outline"
            colorScheme="brand"
            size="sm"
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
          <Button variant="ghost" onClick={onClose} color="white">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default TimesheetDetailModal;
