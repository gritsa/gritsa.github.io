# Quick Start Guide - Gritsa Employee Portal

## For Developers

### Local Development

```bash
# Navigate to the project
cd portal-app

# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser to http://localhost:5173
```

### Build for Production

```bash
npm run build
```

The built files will be output to the parent directory (root).

## For Administrators

### First Login

1. Go to https://gritsa.github.io
2. Login with:
   - Email: `admin@gritsa.com`
   - Password: `123@gritsa`

### Initial Setup Checklist

- [ ] **Add National Holidays**
  - Navigate to Admin > Holidays
  - Add the 10 national holidays employees can observe

- [ ] **Create Projects**
  - Navigate to Admin > Projects
  - Create projects and assign employees

- [ ] **Set Up Organization Chart**
  - Navigate to Admin > Users
  - Assign managers to employees
  - Navigate to Admin > Org Chart to view structure

- [ ] **Configure User Roles**
  - Navigate to Admin > Users
  - Assign roles (Employee, Manager, Administrator)

## For Employees

### Registration

1. Go to https://gritsa.github.io
2. If you have a `@gritsa.com` email, you can register
3. You'll be automatically assigned the Employee role

### Complete Your Profile

After first login:

1. Fill in personal details:
   - Full name
   - Date of birth
   - Phone number
   - Alternate contact

2. Add emergency contact information:
   - Name
   - Phone
   - Relationship

3. Upload documents:
   - PAN Card (image or PDF)
   - Aadhaar Card (image or PDF)

### Daily Tasks

**Submit Timesheet:**
- Navigate to Timesheet
- Select month and year
- For each day:
  - Choose: Full Day / Half Day / Leave
  - Describe what you worked on
- Save as Draft or Submit

**Apply for Leave:**
- Navigate to Leaves
- Click "Apply for Leave"
- Select leave type:
  - Paid Leave
  - Sick Leave
  - National Holiday
- Choose dates
- Provide reason
- Submit

**View Dashboard:**
- See your leave balance
- View assigned projects
- Quick access to common actions

## For Managers

### Approve Leave Requests

1. Navigate to Manager Dashboard
2. Go to "Leave Approvals" tab
3. Click "Review" on pending requests
4. Approve or Reject with optional comments

### View Team Information

**Team Members:**
- Navigate to Manager > My Team
- See all reporting employees

**Team Timesheets:**
- Navigate to Manager > Team Timesheets
- View submitted timesheets

## Common Workflows

### Adding a New Employee

1. **Admin creates user account** (or employee self-registers)
2. **Employee completes profile** on first login
3. **Admin assigns:**
   - Manager
   - Projects
   - Any special permissions

### Leave Request Process

1. **Employee applies** for leave
2. **System checks** leave balance
3. **Manager/Admin reviews** request
4. **Approval/Rejection** with comments
5. **Leave balance updated** if approved

### Monthly Timesheet Submission

1. **Employee fills** timesheet throughout the month
2. **Save as Draft** to continue later
3. **Submit** when month is complete
4. **Manager/Admin can view** submitted timesheets

## Tips and Best Practices

### For Employees

- Complete your timesheet regularly (don't wait until month-end)
- Save drafts frequently
- Apply for leaves in advance
- Keep documents updated

### For Managers

- Review leave requests promptly
- Check team timesheets regularly
- Provide clear comments when rejecting leave
- Keep team assignments updated

### For Administrators

- Regularly review user roles and permissions
- Keep national holidays list updated
- Monitor project assignments
- Backup important data periodically

## Troubleshooting

### Can't Login

- Ensure you're using a `@gritsa.com` email
- Check password is correct
- Try password reset if needed

### Profile Won't Save

- Ensure all required fields are filled
- Check file sizes (max 10MB per document)
- Verify file formats (images or PDFs only)

### Leave Request Denied

- Check your leave balance
- Ensure dates are valid
- Contact your manager for specific reasons

### Timesheet Not Submitting

- Ensure all days have descriptions
- Check for any validation errors
- Try saving as draft first

## Support

For technical issues:
- Contact IT Support
- Email: support@gritsa.com

For HR-related questions:
- Contact HR Department
- Email: hr@gritsa.com
