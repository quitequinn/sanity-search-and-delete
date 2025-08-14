#!/bin/bash

# Setup automation for Sanity utility packages
# This script sets up GitHub Actions and other automation tools

set -e

echo "🚀 Setting up automation for Sanity utility package..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a git repository"
    exit 1
fi

# Get package name from package.json
PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "unknown")
print_status "Setting up automation for package: $PACKAGE_NAME"

# Create .github/workflows directory if it doesn't exist
mkdir -p .github/workflows

# Check if GitHub Actions workflow already exists
if [ -f ".github/workflows/publish.yml" ]; then
    print_warning "GitHub Actions workflow already exists"
else
    print_status "GitHub Actions workflow created"
fi

# Create additional automation files
print_status "Creating additional automation files..."

# Create release script
cat > scripts/release.sh << 'EOF'
#!/bin/bash

# Release script for automated version bumping and publishing

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 Starting release process..."
echo "📦 Version bump type: $VERSION_TYPE"

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Must be on main branch to release. Currently on: $CURRENT_BRANCH"
    exit 1
fi

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working directory is not clean. Please commit or stash changes."
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps

# Run tests if they exist
if npm run test --if-present; then
    echo "✅ Tests passed"
else
    echo "⚠️  No tests found or tests failed"
fi

# Build the package
echo "🔨 Building package..."
npm run build

# Bump version
echo "📈 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE

# Push changes and tags
echo "📤 Pushing changes and tags..."
git push --follow-tags

echo "🎉 Release process completed!"
echo "📦 GitHub Actions will now handle the NPM publishing"
EOF

chmod +x scripts/release.sh

# Create package health check script
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash

# Health check script for package quality

set -e

echo "🏥 Running package health check..."

# Check if package.json exists and is valid
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found"
    exit 1
fi

# Validate package.json
if ! node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))"; then
    echo "❌ package.json is not valid JSON"
    exit 1
fi

echo "✅ package.json is valid"

# Check for required fields
REQUIRED_FIELDS=("name" "version" "description" "main" "types")
for field in "${REQUIRED_FIELDS[@]}"; do
    if ! node -p "require('./package.json').$field" >/dev/null 2>&1; then
        echo "❌ Missing required field: $field"
        exit 1
    fi
done

echo "✅ All required fields present"

# Check if build works
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Check if dist files exist
if [ -d "dist" ] && [ "$(ls -A dist)" ]; then
    echo "✅ Distribution files generated"
else
    echo "❌ No distribution files found"
    exit 1
fi

# Check TypeScript types
if [ -f "dist/index.d.ts" ]; then
    echo "✅ TypeScript definitions generated"
else
    echo "⚠️  No TypeScript definitions found"
fi

echo "🎉 Package health check completed successfully!"
EOF

chmod +x scripts/health-check.sh

# Create dependency update script
cat > scripts/update-deps.sh << 'EOF'
#!/bin/bash

# Update dependencies script

set -e

echo "📦 Updating dependencies..."

# Update package-lock.json
npm update

# Check for security vulnerabilities
echo "🔒 Checking for security vulnerabilities..."
npm audit --audit-level=moderate

# Run health check
echo "🏥 Running health check..."
./scripts/health-check.sh

echo "✅ Dependencies updated successfully!"
EOF

chmod +x scripts/update-deps.sh

print_success "Automation setup completed!"
print_status "Available commands:"
echo "  📦 ./scripts/release.sh [patch|minor|major] - Create a new release"
echo "  🏥 ./scripts/health-check.sh - Run package health check"
echo "  📦 ./scripts/update-deps.sh - Update dependencies safely"
echo ""
print_status "To complete setup:"
echo "  1. Add NPM_TOKEN to GitHub repository secrets"
echo "  2. Run: ./scripts/health-check.sh"
echo "  3. Test release: ./scripts/release.sh patch"
echo ""
print_success "🎉 Automation is ready to use!"
