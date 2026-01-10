# Deployment Instructions for Gritsa Employee Portal

## Prerequisites

Before deploying, ensure you have:

1. **Firebase Project** set up at https://console.firebase.google.com/
2. **Firebase CLI** installed: `npm install -g firebase-tools`
3. **Node.js 20+** installed
4. **GitHub repository** configured with GitHub Pages

## Initial Firebase Setup

### 1. Enable Firebase Services

In your Firebase Console (https://console.firebase.google.com/):

1. **Authentication**
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider

2. **Firestore Database**
   - Go to Firestore Database
   - Create database (start in production mode, we'll deploy rules)
   - Select your preferred region

3. **Storage**
   - Go to Storage
   - Get started with default settings

### 2. Deploy Security Rules

From the `portal-app` directory:

```bash
# Login to Firebase (if not already logged in)
firebase login

# Initialize Firebase in the project (if not already done)
firebase init

# When prompted, select:
# - Firestore
# - Storage
# - Use existing project: gritsa-portal

# Deploy the rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

Alternatively, you can manually copy the rules from `firestore.rules` and `storage.rules` to the Firebase Console:
- Firestore rules: Firestore Database > Rules tab
- Storage rules: Storage > Rules tab

## GitHub Pages Setup

### 1. Configure GitHub Pages

1. Go to your repository on GitHub
2. Navigate to Settings > Pages
3. Under "Build and deployment":
   - Source: Deploy from a branch
   - Branch: `main` / `(root)`
4. Save

### 2. GitHub Actions

The GitHub Actions workflow is already configured in `.github/workflows/deploy.yml`.

It will automatically:
- Build the application on every push to `main`
- Deploy the built files to the root directory
- Trigger GitHub Pages to update

## Manual Deployment

If you need to deploy manually without pushing to main:

```bash
cd portal-app
npm install
npm run build

# The built files will be in the parent directory (root)
# Commit and push:
cd ..
git add index.html assets/
git commit -m "Manual deployment"
git push origin main
```

## First Time Setup After Deployment

1. **Access the Portal**
   - Go to https://gritsa.github.io (or your configured domain)

2. **Login with Default Admin**
   - Email: `admin@gritsa.com`
   - Password: `123@gritsa`

3. **Change Admin Password** (Important!)
   - The default admin account is auto-created
   - For security, you should immediately:
     - Create a new admin account with a secure password
     - Or change the default admin password in Firebase Console

4. **Configure the System**
   - Add national holidays (Admin > Holidays)
   - Create projects (Admin > Projects)
   - Invite employees to register (they need @gritsa.com email addresses)
   - Set up the organization chart (Admin > Org Chart)

## Employee Onboarding

### For New Employees

1. **Registration**
   - New employees with `@gritsa.com` email addresses are automatically granted Employee role
   - They can register using Firebase Authentication
   - First login will prompt them to complete their profile

2. **Profile Completion**
   - Employees must fill in:
     - Personal details
     - Emergency contact
     - Upload documents (PAN, Aadhaar)
   - Until profile is complete, they cannot access other features

3. **Assignment**
   - Admin assigns:
     - Manager (if applicable)
     - Projects
     - Any role upgrades (Employee → Manager → Administrator)

## Monitoring and Maintenance

### Firebase Usage

Monitor your Firebase usage in the Firebase Console to stay within Spark plan limits:

- **Firestore**: 50K reads, 20K writes, 20K deletes per day
- **Storage**: 1GB storage, 10GB downloads per day
- **Authentication**: Unlimited users

### Backup Strategy

Consider implementing regular backups of Firestore data:

```bash
# Export Firestore data (requires Firebase Blaze plan)
gcloud firestore export gs://[BUCKET_NAME]
```

Alternatively, create periodic manual exports from Firebase Console.

## Troubleshooting

### Build Fails

If the build fails in GitHub Actions:

1. Check the Actions tab for error logs
2. Common issues:
   - Node version mismatch (ensure GitHub Actions uses Node 20+)
   - Missing dependencies (check package-lock.json is committed)
   - TypeScript errors (fix in local development first)

### Firebase Rules Errors

If users can't access data:

1. Check Firebase Console > Firestore/Storage > Rules
2. Verify rules are properly deployed
3. Test rules using the Rules Simulator in Firebase Console

### Authentication Issues

If default admin creation fails:

1. Manually create the admin user in Firebase Console:
   - Authentication > Users > Add user
   - Email: admin@gritsa.com
   - Password: 123@gritsa

2. Add user document in Firestore:
   - Collection: users
   - Document ID: [the UID from Authentication]
   - Fields:
     ```
     uid: [the UID]
     email: "admin@gritsa.com"
     role: "Administrator"
     profileCompleted: true
     createdAt: [current timestamp]
     ```

## Updating the Application

To update the application after making changes:

```bash
cd portal-app

# Make your changes to source files

# Test locally
npm run dev

# When ready to deploy
git add .
git commit -m "Description of changes"
git push origin main

# GitHub Actions will automatically build and deploy
```

## Security Checklist

- [ ] Firebase security rules deployed
- [ ] Storage security rules deployed
- [ ] Default admin password changed
- [ ] Environment variables (if any) configured
- [ ] HTTPS enabled on GitHub Pages
- [ ] Regular security audits scheduled

## Support

For technical issues or questions:
- Check the GitHub Issues
- Contact the development team
- Review Firebase documentation: https://firebase.google.com/docs
