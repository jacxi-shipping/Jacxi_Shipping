#!/bin/bash

# Validation script to check if the loginCode fix is correctly configured
# This script doesn't require a database connection - it just validates the files

echo "🔍 Validating loginCode Configuration..."
echo ""

ERRORS=0

# Check 1: Verify schema.prisma has loginCode field
echo "✓ Checking Prisma schema..."
if grep -q "loginCode.*String" prisma/schema.prisma; then
    echo "  ✅ loginCode field found in User model"
else
    echo "  ❌ loginCode field NOT found in User model"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: Verify migration file exists
echo "✓ Checking migration file..."
if [ -f "prisma/migrations/20260131223000_add_login_codes/migration.sql" ]; then
    echo "  ✅ Migration file exists"
    
    # Check migration content
    if grep -q "ADD COLUMN \"loginCode\"" "prisma/migrations/20260131223000_add_login_codes/migration.sql"; then
        echo "  ✅ Migration adds loginCode column"
    else
        echo "  ❌ Migration doesn't add loginCode column"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "CREATE UNIQUE INDEX.*loginCode" "prisma/migrations/20260131223000_add_login_codes/migration.sql"; then
        echo "  ✅ Migration creates unique index on loginCode"
    else
        echo "  ❌ Migration doesn't create unique index"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  ❌ Migration file NOT found"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Verify auth.ts uses loginCode
echo "✓ Checking auth configuration..."
if grep -q "loginCode" "src/lib/auth.ts"; then
    echo "  ✅ auth.ts references loginCode"
else
    echo "  ❌ auth.ts doesn't reference loginCode"
    ERRORS=$((ERRORS + 1))
fi

# Check 4: Verify .env.example has correct database URLs
echo "✓ Checking environment configuration..."
if grep -q "jacxi_DATABASE_URL" ".env.example"; then
    echo "  ✅ .env.example includes jacxi_DATABASE_URL"
else
    echo "  ❌ .env.example missing jacxi_DATABASE_URL"
    ERRORS=$((ERRORS + 1))
fi

if grep -q "jacxi_POSTGRES_URL" ".env.example"; then
    echo "  ✅ .env.example includes jacxi_POSTGRES_URL"
else
    echo "  ❌ .env.example missing jacxi_POSTGRES_URL"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Verify build script includes migration
echo "✓ Checking build script..."
if grep -q "prisma migrate deploy" "package.json"; then
    echo "  ✅ Build script includes migration deployment"
else
    echo "  ⚠️  Build script doesn't include migration deployment (optional)"
fi

if grep -q "prisma generate" "package.json"; then
    echo "  ✅ Build script includes Prisma generation"
else
    echo "  ❌ Build script missing Prisma generation"
    ERRORS=$((ERRORS + 1))
fi

# Check 6: Verify documentation exists
echo "✓ Checking documentation..."
if [ -f "FIX_LOGINCODE_ERROR.md" ]; then
    echo "  ✅ Fix documentation exists (FIX_LOGINCODE_ERROR.md)"
else
    echo "  ⚠️  Fix documentation not found (optional)"
fi

if [ -f "scripts/fix-logincode.sh" ]; then
    echo "  ✅ Fix script exists (scripts/fix-logincode.sh)"
else
    echo "  ⚠️  Fix script not found (optional)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo "✅ All validations passed!"
    echo ""
    echo "The loginCode configuration is correct."
    echo ""
    echo "Next steps:"
    echo "1. Set up your .env.local with jacxi_DATABASE_URL and jacxi_POSTGRES_URL"
    echo "2. Run: npm run db:generate"
    echo "3. Run: npx prisma migrate deploy"
    echo "4. Run: npm run dev"
    echo ""
    echo "Or use the automated fix script:"
    echo "  bash scripts/fix-logincode.sh"
    exit 0
else
    echo "❌ $ERRORS validation error(s) found!"
    echo ""
    echo "Please fix the errors above before proceeding."
    exit 1
fi
