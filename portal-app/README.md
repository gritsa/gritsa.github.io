# Gritsa Employee Portal

A comprehensive employee management portal built with React, TypeScript, Firebase, and Chakra UI.

## Features

### For All Employees
- **Profile Management**: Create and update personal profiles with document uploads (PAN Card, Aadhaar Card)
- **Timesheet Management**: Submit monthly timesheets with day-by-day work descriptions
- **Leave Management**: Apply for leaves and track leave balance
  - 18 Paid & Sick Leaves per year
  - 10 National Holidays (configurable by admin)
- **Dashboard**: View assigned projects, leave balance, and quick actions

### For Managers
- **Leave Approvals**: Review and approve/reject leave requests from team members
- **Team Oversight**: View team members and their timesheets
- **Reporting**: Access team member information and project assignments

### For Administrators
- **User Management**: Manage user roles (Employee, Manager, Administrator)
- **Project Management**: Create and assign projects to employees
- **Organization Chart**: Configure reporting structure
- **Timesheet Review**: View all submitted timesheets
- **Holiday Management**: Configure national holidays for the year

## Default Admin Account

The application automatically creates a default admin account on first run:

- **Email**: admin@gritsa.com
- **Password**: 123@gritsa

**Important**: Change the password after first login for security.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Build for production: `npm run build`

## Deployment

The app automatically deploys to GitHub Pages via GitHub Actions when pushing to main branch.

## Firebase Setup

Deploy the security rules:
```bash
firebase deploy --only firestore:rules,storage:rules
```

See firestore.rules and storage.rules for the security configuration.
