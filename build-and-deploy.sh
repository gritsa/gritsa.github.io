#!/bin/bash

# Build and Deploy Script for GitHub Pages
# This script builds the React app and prepares it for GitHub Pages deployment

set -e  # Exit on error

echo "🚀 Starting build process..."

# Remove old build files from root (except .git, portal-app, and other important files)
echo "🧹 Cleaning old build files..."
find . -maxdepth 1 -type f -name "*.html" -delete 2>/dev/null || true
find . -maxdepth 1 -type f -name "*.js" -delete 2>/dev/null || true
find . -maxdepth 1 -type f -name "*.css" -delete 2>/dev/null || true
rm -rf assets 2>/dev/null || true

# Navigate to portal-app directory
cd portal-app

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Build the production app (builds directly to repo root via vite.config.ts)
echo "🔨 Building production bundle..."
npm run build

# Navigate back to repo root
cd ..

# Create .nojekyll file to disable Jekyll processing
# This is critical for files/folders starting with underscore
echo "🔧 Creating .nojekyll file..."
touch .nojekyll

# Create a simple .gitignore for the root if it doesn't exist
if [ ! -f .gitignore ]; then
  echo "📝 Creating .gitignore..."
  cat > .gitignore << 'EOF'
# Node modules
node_modules/

# Build artifacts
portal-app/dist/
portal-app/node_modules/

# Environment files
.env
.env.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
EOF
fi

echo "✅ Build complete! Files are ready in the root directory."
echo ""
echo "📦 Next steps:"
echo "   1. Review the changes: git status"
echo "   2. Stage all files: git add ."
echo "   3. Commit: git commit -m 'Deploy portal app to GitHub Pages'"
echo "   4. Push: git push origin main"
echo ""
echo "🌐 Your site will be live at: https://gritsa.github.io/"
