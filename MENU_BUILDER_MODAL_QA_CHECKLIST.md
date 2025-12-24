# Menu Builder Modal - QA & Visual Regression Testing Checklist

## Overview
This checklist ensures the Menu Builder modals maintain quality across all devices and prevent regressions.

## Test Matrix - Breakpoints

### Mobile (375px - iPhone SE)
- [ ] Modal takes full screen height/width
- [ ] Header is sticky and visible at top
- [ ] Footer is sticky and visible at bottom
- [ ] Content scrolls smoothly in body area
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable (minimum 16px font size)
- [ ] No horizontal scrolling occurs
- [ ] Buttons stack vertically (full width)

### Tablet (768px - iPad)
- [ ] Modal is centered and max-width applied
- [ ] Adequate padding around modal edges
- [ ] Form sections are visually separated
- [ ] Two-column layouts work properly
- [ ] Buttons arranged horizontally in footer

### Desktop Small (1024px)
- [ ] Modal centered with 900px max-width
- [ ] All form sections properly spaced
- [ ] Grid layouts (2-column) display correctly
- [ ] Shadow and border radius visible

### Desktop Large (1440px+)
- [ ] Modal maintains max-width (doesn't stretch too wide)
- [ ] Content remains centered
- [ ] Typography scales appropriately

---

## Functional Testing

### "Add Item to Step" Modal
- [ ] **Open**: Click "Add Item" button in expanded step
- [ ] **Form Validation**: Submit without selecting item (should show validation)
- [ ] **Item Selection**: Dropdown shows only available items
- [ ] **Override Price**: Can enter custom price or leave blank
- [ ] **Sort Order**: Numeric input works correctly
- [ ] **Active Toggle**: Checkbox toggles correctly
- [ ] **Submit**: Successfully adds item to step
- [ ] **Cancel**: Closes modal without saving
- [ ] **Close (X)**: Top-right X button closes modal
- [ ] **ESC Key**: Pressing ESC closes modal
- [ ] **Backdrop Click**: Clicking outside modal closes it

### "Create/Edit Step" Modal
- [ ] **Open Create**: Click "Add Step" button
- [ ] **Open Edit**: Click edit icon on existing step
- [ ] **Form Pre-fill**: Edit mode pre-fills form correctly
- [ ] **Step Name**: Required field validation works
- [ ] **Step Key**: Auto-converts to lowercase with underscores
- [ ] **Selection Type**: Single/Multiple toggle works
- [ ] **Min/Max Fields**: Show only for "multiple" type
- [ ] **Required Toggle**: Checkbox works correctly
- [ ] **Sort Order**: Numeric input works
- [ ] **Submit Create**: Creates new step successfully
- [ ] **Submit Update**: Updates existing step
- [ ] **Cancel**: Closes without saving
- [ ] **Close (X)**: Closes modal
- [ ] **ESC Key**: Closes modal

### Delete Confirmation Modals
- [ ] **Delete Step**: Shows warning with proper context
- [ ] **Delete Step Item**: Shows warning with proper context
- [ ] **Cancel**: Closes without deleting
- [ ] **Confirm Delete**: Executes delete action
- [ ] **Loading State**: Shows spinner during deletion
- [ ] **Success**: Closes modal and shows success notification

---

## Visual Quality Checks

### Typography & Readability
- [ ] All text is crisp and high-contrast (AA compliant)
- [ ] Labels are bold/semibold for hierarchy
- [ ] Helper text is smaller and gray (but readable)
- [ ] No text appears washed out or low-opacity
- [ ] Font sizes: Title 20px, Label 14px, Body 16px, Helper 12px

### Colors & Contrast
- [ ] Modal background: Pure white (#FFFFFF)
- [ ] Overlay: Black 60% opacity with 2px blur
- [ ] Text: Gray-900 (#111827) for primary text
- [ ] Text: Gray-600 (#4B5563) for descriptions
- [ ] Text: Gray-500 (#6B7280) for helper text
- [ ] Borders: Gray-200 (#E5E7EB) for section dividers
- [ ] Primary Button: Orange-600 (#EA580C)
- [ ] Secondary Button: White with gray-300 border

### Spacing & Layout
- [ ] Header padding: 20-24px (desktop), 16px (mobile)
- [ ] Body padding: 24px (desktop), 16px (mobile)
- [ ] Footer padding: 20-24px (desktop), 16px (mobile)
- [ ] Section spacing: 24px between sections
- [ ] Field spacing: 16px between fields
- [ ] Label-to-input spacing: 8px

### Shadows & Depth
- [ ] Modal shadow: `0 12px 32px 0 rgba(44,26,22,0.15)`
- [ ] Shadow visible on all backgrounds
- [ ] No double-shadows or conflicting shadows
- [ ] Border radius: 24px (1.5rem) on desktop, 0px on mobile

### Animations
- [ ] Modal fades in smoothly (no jank)
- [ ] Modal scales in from 95% to 100%
- [ ] Overlay fades in simultaneously
- [ ] Modal fades out smoothly on close
- [ ] No layout shift during animation
- [ ] Smooth transitions on hover states

---

## Accessibility Testing

### Keyboard Navigation
- [ ] TAB moves focus through all interactive elements
- [ ] Focus order is logical (top to bottom, left to right)
- [ ] Focus indicator is visible on all elements
- [ ] SHIFT+TAB moves focus backwards
- [ ] ESC closes modal from any focused element
- [ ] Focus returns to trigger button on close

### Screen Reader
- [ ] Modal has `role="dialog"`
- [ ] Modal has `aria-modal="true"`
- [ ] Title has proper `aria-labelledby`
- [ ] Description has proper `aria-describedby`
- [ ] All form fields have associated labels
- [ ] Required fields marked with `aria-required`
- [ ] Error messages associated with fields
- [ ] Close button has "Close" label

### Focus Management
- [ ] Focus trapped within modal when open
- [ ] Cannot tab out of modal to page behind
- [ ] First focusable element gets focus on open
- [ ] Focus returns to trigger on close

---

## Cross-Browser Testing

### Chrome/Edge (Chromium)
- [ ] All features work correctly
- [ ] Animations are smooth
- [ ] No visual glitches

### Firefox
- [ ] All features work correctly
- [ ] Focus management works
- [ ] Scrolling behavior correct

### Safari (macOS/iOS)
- [ ] Backdrop blur renders correctly
- [ ] Touch gestures work on iOS
- [ ] Safe area insets respected on iPhone

---

## Performance

- [ ] Modal opens in <100ms
- [ ] No layout shift or reflow on open
- [ ] Smooth 60fps animations
- [ ] No memory leaks on repeated open/close
- [ ] Form inputs respond immediately

---

## Regression Prevention

### Before Each Release
1. Run through this entire checklist
2. Test all 4 breakpoints (375px, 768px, 1024px, 1440px)
3. Test in at least 2 browsers
4. Test keyboard navigation
5. Verify no console errors

### When Modifying Modal Component
1. Test all modals using the Dialog component:
   - Menu Builder: Add Item, Create/Edit Step, Delete confirmations
   - Check for other components using the Dialog
2. Test that changes don't break existing modals
3. Verify accessibility features still work

### Screenshots Archive
Consider taking screenshots of each modal at each breakpoint and storing them in `/vitereact/screenshots/modals/` for future visual comparison.

---

## Quick Visual Test (30 seconds)

1. Open `/admin/menu/builder`
2. Open each modal type
3. Resize browser from 375px → 1440px
4. Close each modal with ESC, X button, and backdrop click

**Pass Criteria**: 
- Text is crisp and readable at all sizes
- No washed out or low-opacity issues
- Modal fits screen at all breakpoints
- Closes smoothly with all methods

---

## Issues to Watch For

### Common Regressions
- ❌ Modal content appears washed out (opacity issue)
- ❌ Text labels are low contrast or hard to read
- ❌ Modal doesn't scroll properly on mobile
- ❌ Footer buttons overlap content
- ❌ Modal too wide on mobile (horizontal scroll)
- ❌ Focus not trapped in modal
- ❌ ESC key doesn't close modal
- ❌ Animation stutters or jumps

### If You See Washed-Out Content
1. Check for `opacity` applied to parent container
2. Verify overlay uses `bg-black/60` not parent opacity
3. Ensure modal content has `bg-white` (not transparent)
4. Check for `filter` or `backdrop-filter` on wrong element
5. Verify no conflicting z-index/stacking context

---

## Test Report Template

```
Test Date: [DATE]
Tester: [NAME]
Browser: [BROWSER + VERSION]
Device: [DEVICE/SCREEN SIZE]

Modal Tested: [Add Item / Create Step / Delete / etc.]

| Test Item                          | Pass | Fail | Notes |
|------------------------------------|------|------|-------|
| Visual Quality (text readability)  |      |      |       |
| Responsive (all breakpoints)       |      |      |       |
| Functionality (submit/cancel)      |      |      |       |
| Keyboard Navigation                |      |      |       |
| Accessibility (ARIA, focus)        |      |      |       |
| Animations (smooth, no jank)       |      |      |       |

Overall Result: [PASS / FAIL]
Issues Found: [LIST]
```

---

## Automated Testing Suggestion

Consider adding these Playwright tests:

```typescript
// vitereact/tests/menu-builder-modals.spec.ts

test('Add Item modal is readable and functional', async ({ page }) => {
  await page.goto('/admin/menu/builder');
  await page.click('text=Add Item');
  
  // Visual regression check
  await expect(page.locator('[role="dialog"]')).toHaveScreenshot('add-item-modal.png');
  
  // Accessibility check
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toHaveAttribute('aria-modal', 'true');
  
  // Keyboard navigation
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
});

test('Modal responsive on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/admin/menu/builder');
  await page.click('text=Add Item');
  
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toHaveScreenshot('add-item-modal-mobile.png');
});
```

---

## Success Metrics

✅ **Modal Implementation Complete** when:
- All 4 modals refactored to use Dialog component
- All tests pass on all 4 breakpoints
- No console errors or warnings
- Accessibility score 100% (Chrome DevTools)
- Text is crisp and readable (no washed-out appearance)
- Animations are smooth 60fps
- Keyboard navigation works perfectly
