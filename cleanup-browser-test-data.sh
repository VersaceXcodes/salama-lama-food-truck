#!/bin/bash
# Browser Test Data Cleanup Script
# This script removes test user data from the database before running browser tests

set -e  # Exit on error

echo "========================================="
echo "Browser Test Data Cleanup"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL to your PostgreSQL connection string"
    exit 1
fi

echo "🔍 Checking for test user data..."
echo ""

# Run the cleanup SQL script
echo "🧹 Running cleanup script..."
psql "$DATABASE_URL" -f cleanup_browser_test_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Cleanup completed successfully!"
    echo ""
    echo "Test data removed:"
    echo "  - Email: test.signup@example.com"
    echo "  - Phone: +353871234599"
    echo ""
    echo "You can now run browser tests."
else
    echo ""
    echo "❌ Cleanup failed! Please check the error messages above."
    exit 1
fi

echo "========================================="
