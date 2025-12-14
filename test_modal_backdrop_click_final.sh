#!/bin/bash

# Modal Backdrop Click Fix - Final Test Script
# Tests the customization modal backdrop click functionality

echo "======================================"
echo "Modal Backdrop Click Fix - Final Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing customization modal backdrop click behavior...${NC}"
echo ""

# Check if the fix has been applied
echo "1. Verifying fix in UV_Menu.tsx..."
if grep -q 'onClick={handleCloseCustomizationModal}' /app/vitereact/src/components/views/UV_Menu.tsx; then
    # Check if it's on the backdrop div
    if grep -A 2 'className="fixed inset-0 bg-black bg-opacity-50' /app/vitereact/src/components/views/UV_Menu.tsx | grep -q 'onClick={handleCloseCustomizationModal}'; then
        echo -e "${GREEN}✓ Backdrop click handler is correctly placed${NC}"
    else
        echo -e "${RED}✗ Backdrop click handler is not on the backdrop div${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Click handler not found${NC}"
    exit 1
fi

# Check that the outer container doesn't have the onClick handler
echo "2. Verifying outer container structure..."
if grep -B 2 'className="fixed inset-0 z-50 overflow-y-auto"' /app/vitereact/src/components/views/UV_Menu.tsx | grep -q 'onClick='; then
    echo -e "${RED}✗ Outer container still has onClick handler (should be removed)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Outer container correctly has no onClick handler${NC}"
fi

# Check that stopPropagation is not on the modal content
echo "3. Verifying modal content structure..."
if grep -A 3 'className="relative bg-white rounded-xl shadow-2xl max-w-2xl' /app/vitereact/src/components/views/UV_Menu.tsx | grep -q 'stopPropagation'; then
    echo -e "${RED}✗ Modal content has stopPropagation (should be removed)${NC}"
    exit 1
else
    echo -e "${GREEN}✓ Modal content correctly has no stopPropagation${NC}"
fi

# Verify ESC key handler is still present
echo "4. Verifying ESC key handler..."
if grep -q "event.key === 'Escape'" /app/vitereact/src/components/views/UV_Menu.tsx; then
    echo -e "${GREEN}✓ ESC key handler is present${NC}"
else
    echo -e "${RED}✗ ESC key handler is missing${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}======================================"
echo "All checks passed!"
echo "======================================${NC}"
echo ""
echo "Expected behavior:"
echo "  ✓ Clicking backdrop closes modal"
echo "  ✓ ESC key closes modal"
echo "  ✓ Close button (X) closes modal"
echo "  ✓ Cancel button closes modal"
echo "  ✓ Modal content clicks don't close modal"
echo ""
echo "File modified: /app/vitereact/src/components/views/UV_Menu.tsx"
echo ""
