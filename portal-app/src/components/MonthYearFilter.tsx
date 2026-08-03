import React from 'react';
import { HStack, Select } from '@chakra-ui/react';

interface MonthYearFilterProps {
  month: number | '';
  year: number | '';
  onMonthChange: (month: number | '') => void;
  onYearChange: (year: number | '') => void;
  /** 1 (default) for tables that store month 1-12 (e.g. payslips); 0 for tables that store
   *  month 0-11 (e.g. timesheets, matching `Date.getMonth()`). */
  monthOffset?: 0 | 1;
  years?: number[];
  size?: 'sm' | 'md';
  /** When true, prepends an "All Months"/"All Years" option (value ''), for browsing filters
   *  that default to showing everything. Payroll's fixed single-month lookup leaves this off. */
  allowAll?: boolean;
}

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => new Date(2000, i).toLocaleString('default', { month: 'long' }));

function defaultYears(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - 2 + i);
}

/** Shared month + year dropdown pair used across Payroll, Timesheets, and Expenses filters. */
const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  monthOffset = 1,
  years,
  size = 'sm',
  allowAll = false,
}) => {
  const yearOptions = years || defaultYears();

  return (
    <HStack>
      <Select
        size={size}
        value={month}
        onChange={(e) => onMonthChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        maxW="140px"
        variant="filled"
        color="white"
        aria-label="Filter by month"
      >
        {allowAll && <option value="">All Months</option>}
        {MONTH_NAMES.map((name, i) => (
          <option key={i} value={i + monthOffset} style={{ color: 'black' }}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        size={size}
        value={year}
        onChange={(e) => onYearChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
        maxW="110px"
        variant="filled"
        color="white"
        aria-label="Filter by year"
      >
        {allowAll && <option value="">All Years</option>}
        {yearOptions.map((y) => (
          <option key={y} value={y} style={{ color: 'black' }}>
            {y}
          </option>
        ))}
      </Select>
    </HStack>
  );
};

export default MonthYearFilter;
