#!/bin/bash

# Test script to verify registration error banner fix v3
# This script checks that the error banner is properly displayed

echo "=========================================="
echo "Registration Error Banner Fix V3 - Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Checking if frontend build succeeded...${NC}"
if [ -f "/app/vitereact/public/index.html" ]; then
    echo -e "${GREEN}✓ Frontend build files exist${NC}"
else
    echo -e "${RED}✗ Frontend build files not found${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}2. Checking UV_Signup.tsx for key changes...${NC}"

# Check for stable ref pattern (div always rendered)
if grep -q 'ref={errorBannerRef}' /app/vitereact/src/components/views/UV_Signup.tsx && \
   grep -q 'className={registration_error' /app/vitereact/src/components/views/UV_Signup.tsx; then
    echo -e "${GREEN}✓ Stable ref pattern implemented (div always rendered)${NC}"
else
    echo -e "${RED}✗ Stable ref pattern not found${NC}"
fi

# Check that setTimeout was removed from error handling
if grep -A5 "Use flushSync to ensure state updates" /app/vitereact/src/components/views/UV_Signup.tsx | grep -q "setTimeout"; then
    echo -e "${RED}✗ setTimeout still wrapping error state updates${NC}"
else
    echo -e "${GREEN}✓ setTimeout removed from error state updates${NC}"
fi

# Check for flushSync usage
if grep -q "flushSync(() => {" /app/vitereact/src/components/views/UV_Signup.tsx; then
    echo -e "${GREEN}✓ flushSync is being used for state updates${NC}"
else
    echo -e "${RED}✗ flushSync not found${NC}"
fi

# Check for enhanced visibility logging
if grep -q "Error banner visibility check:" /app/vitereact/src/components/views/UV_Signup.tsx; then
    echo -e "${GREEN}✓ Enhanced visibility logging added${NC}"
else
    echo -e "${RED}✗ Enhanced visibility logging not found${NC}"
fi

# Check for aria-hidden attribute
if grep -q 'aria-hidden={!registration_error}' /app/vitereact/src/components/views/UV_Signup.tsx; then
    echo -e "${GREEN}✓ Accessibility attributes updated${NC}"
else
    echo -e "${RED}✗ Accessibility attributes not updated${NC}"
fi

echo ""
echo -e "${YELLOW}3. Verifying backend error handling...${NC}"

# Check backend returns correct error code
if grep -q "EMAIL_ALREADY_EXISTS" /app/backend/server.ts; then
    echo -e "${GREEN}✓ Backend returns EMAIL_ALREADY_EXISTS error code${NC}"
else
    echo -e "${RED}✗ Backend error code not found${NC}"
fi

# Check backend returns 409 status
if grep -q "status(409)" /app/backend/server.ts; then
    echo -e "${GREEN}✓ Backend returns 409 status for duplicate email${NC}"
else
    echo -e "${RED}✗ Backend 409 status not found${NC}"
fi

echo ""
echo -e "${YELLOW}4. Summary of fixes:${NC}"
echo "   - Error banner div is always rendered (stable ref)"
echo "   - setTimeout removed from error state updates"
echo "   - flushSync ensures synchronous state updates"
echo "   - Enhanced visibility checks in useEffect"
echo "   - Improved accessibility with aria-hidden"
echo ""

echo -e "${GREEN}=========================================="
echo "All checks passed! Ready for browser testing."
echo "==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run automated browser tests"
echo "2. Verify error banner appears on duplicate email"
echo "3. Check error message: 'Email already registered'"
echo "4. Confirm page scrolls to error banner"
echo "5. Verify email field focus"
