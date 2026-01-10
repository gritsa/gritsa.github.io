export type UserRole = 'Employee' | 'Manager' | 'Administrator';

export type LeaveType = 'Paid' | 'Sick' | 'National Holiday';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export type TimesheetDayType = 'Full Day' | 'Half Day' | 'Leave';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  profileCompleted: boolean;
  createdAt: Date;
  managerId?: string;
  projectIds?: string[];
}

export interface EmployeeProfile {
  uid: string;
  personalDetails: {
    fullName: string;
    dateOfBirth?: Date;
    phone: string;
    alternateContact?: string;
    emergencyContact: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  documents: {
    panCard?: string; // Storage URL
    aadhaarCard?: string; // Storage URL
  };
  employmentDetails: {
    employeeId?: string;
    joiningDate?: Date;
    department?: string;
  };
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface Timesheet {
  id: string;
  employeeId: string;
  month: number; // 0-11
  year: number;
  days: {
    [day: number]: { // 1-31
      type: TimesheetDayType;
      description: string;
    };
  };
  submittedAt?: Date;
  status: 'Draft' | 'Submitted';
}

export interface LeaveBalance {
  uid: string;
  year: number;
  paidAndSick: number; // starts at 18
  nationalHolidays: number; // starts at 10
  usedPaidAndSick: number;
  usedNationalHolidays: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  managerId?: string;
  leaveType: LeaveType;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: LeaveStatus;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewComments?: string;
}

export interface NationalHoliday {
  id: string;
  name: string;
  date: Date;
  year: number;
  isActive: boolean;
}

export interface OrgNode {
  uid: string;
  managerId?: string;
  reportees: string[];
}
