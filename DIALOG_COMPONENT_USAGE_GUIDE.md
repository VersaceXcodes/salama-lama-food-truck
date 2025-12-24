# Dialog Component - Quick Start Guide

## Overview

A fully accessible, responsive modal/dialog component built on Radix UI for consistent modal patterns across the app.

**Location**: `vitereact/src/components/ui/dialog.tsx`

---

## Basic Usage

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

function MyComponent() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>
              Brief description of what this dialog does
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            {/* Your content here */}
            <p>Dialog content goes here...</p>
          </DialogBody>

          <DialogFooter>
            <button onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## Form with Sections

```tsx
import { DialogSection } from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-[900px]">
    <DialogHeader>
      <DialogTitle>Add Menu Item</DialogTitle>
      <DialogDescription>
        Fill in the details for your menu item
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit}>
      <DialogBody className="space-y-6">
        {/* Section 1 */}
        <DialogSection 
          title="Basic Details"
          description="Name and description of your item"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Item Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </DialogSection>

        {/* Section 2 */}
        <DialogSection title="Pricing">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Price (€)
            </label>
            <input type="number" step="0.01" />
          </div>
        </DialogSection>
      </DialogBody>

      <DialogFooter>
        <button 
          type="button" 
          onClick={() => setOpen(false)}
          className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="px-6 py-2.5 bg-orange-600 text-white rounded-lg"
        >
          Save
        </button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Delete Confirmation Dialog

```tsx
<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <DialogContent className="max-w-[500px]">
    <DialogHeader>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-lg">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <DialogTitle>Delete Item</DialogTitle>
      </div>
      <DialogDescription>
        Are you sure? This action cannot be undone.
      </DialogDescription>
    </DialogHeader>

    <DialogFooter>
      <button onClick={() => setShowDeleteConfirm(false)}>
        Cancel
      </button>
      <button 
        onClick={handleDelete}
        className="bg-red-600 text-white"
      >
        Delete
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Components Reference

### `<Dialog>`
Root component that manages open/closed state.

**Props**:
- `open` (boolean): Whether dialog is open
- `onOpenChange` (function): Callback when open state changes

### `<DialogContent>`
The modal container. Automatically handles overlay, animations, close button.

**Props**:
- `className`: Optional classes (e.g., `"max-w-[900px]"`)
- `showClose`: Show/hide X button (default: true)

**Responsive Behavior**:
- Mobile (<640px): Full-screen
- Desktop: Centered, max-width 900px, rounded corners

### `<DialogHeader>`
Sticky header area with title and description.

**Default Styling**:
- Padding: 24px desktop, 16px mobile
- Border bottom
- Sticky at top when content scrolls

### `<DialogBody>`
Scrollable content area.

**Usage**:
```tsx
<DialogBody className="space-y-6">
  {/* Add space-y-6 for consistent section spacing */}
</DialogBody>
```

### `<DialogFooter>`
Sticky footer with action buttons.

**Default Behavior**:
- Mobile: Buttons stack vertically, full-width
- Desktop: Buttons side-by-side, right-aligned

### `<DialogTitle>`
Accessible title with proper ARIA attributes.

**Styling**: 20px semibold, gray-900

### `<DialogDescription>`
Accessible description.

**Styling**: 14px regular, gray-600

### `<DialogSection>`
Helper for grouping form fields with a title.

**Props**:
- `title`: Section heading
- `description`: Optional section description

**Example**:
```tsx
<DialogSection 
  title="Section Title"
  description="Brief explanation"
>
  {/* Form fields */}
</DialogSection>
```

---

## Styling Guidelines

### Consistent Form Fields

```tsx
{/* Label */}
<label className="block text-sm font-semibold text-gray-900 mb-2">
  Field Name <span className="text-red-600">*</span>
</label>

{/* Input */}
<input
  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
/>

{/* Helper Text */}
<p className="text-xs text-gray-500 mt-2">
  Helpful description or example
</p>
```

### Consistent Buttons

```tsx
{/* Primary Button */}
<button className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
  Save Changes
</button>

{/* Secondary Button */}
<button className="w-full sm:w-auto px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
  Cancel
</button>

{/* Danger Button */}
<button className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2">
  Delete
</button>
```

### Checkbox with Description

```tsx
<div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
  <input
    type="checkbox"
    id="my-checkbox"
    className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-0.5"
  />
  <div className="flex-1">
    <label htmlFor="my-checkbox" className="block text-sm font-semibold text-gray-900 cursor-pointer">
      Enable Feature
    </label>
    <p className="text-xs text-gray-600 mt-1">
      Description of what this checkbox does
    </p>
  </div>
</div>
```

---

## Accessibility Features (Built-in)

✅ **Focus Management**
- Focus trapped within dialog when open
- Can't tab to content behind dialog
- First focusable element gets focus on open
- Focus returns to trigger button on close

✅ **Keyboard Navigation**
- ESC closes the dialog
- TAB/SHIFT+TAB cycles through interactive elements
- ENTER submits forms

✅ **ARIA Attributes**
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` (title)
- `aria-describedby` (description)

✅ **Screen Reader Support**
- All components have proper semantic HTML
- Labels associated with inputs
- Required fields marked

---

## Common Patterns

### Loading State in Footer

```tsx
<DialogFooter>
  <button onClick={() => setOpen(false)}>Cancel</button>
  <button 
    type="submit"
    disabled={isLoading}
  >
    {isLoading ? (
      <span className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
        Saving...
      </span>
    ) : (
      'Save Changes'
    )}
  </button>
</DialogFooter>
```

### Conditional Close (Prevent Close on Backdrop Click)

```tsx
<Dialog 
  open={open} 
  onOpenChange={(newOpen) => {
    // Only allow closing if form is not dirty
    if (!newOpen && !formIsDirty) {
      setOpen(false);
    }
  }}
>
  {/* ... */}
</Dialog>
```

### Two-Column Layout

```tsx
<DialogSection title="Contact Information">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label>First Name</label>
      <input type="text" />
    </div>
    <div>
      <label>Last Name</label>
      <input type="text" />
    </div>
  </div>
</DialogSection>
```

---

## Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| < 640px | Full-screen modal, no border radius, sticky header/footer |
| ≥ 640px | Centered modal, 900px max-width, rounded corners, backdrop blur |

---

## Size Variants

```tsx
{/* Small dialog (500px) - good for confirmations */}
<DialogContent className="max-w-[500px]">

{/* Default dialog (900px) - good for forms */}
<DialogContent className="max-w-[900px]">

{/* Large dialog (1200px) - for complex forms */}
<DialogContent className="max-w-[1200px]">
```

---

## Migration from Old Pattern

### Before (Old Pattern)
```tsx
{showModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
    <div className="bg-white rounded-xl max-w-lg">
      <div className="p-6">
        <h2>Title</h2>
        {/* content */}
        <button onClick={() => setShowModal(false)}>Close</button>
      </div>
    </div>
  </div>
)}
```

### After (New Pattern)
```tsx
<Dialog open={showModal} onOpenChange={setShowModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogBody>
      {/* content */}
    </DialogBody>
    <DialogFooter>
      <button onClick={() => setShowModal(false)}>Close</button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Do's and Don'ts

### ✅ Do
- Use DialogSection to group related fields
- Add helper text to explain fields
- Make buttons full-width on mobile
- Test keyboard navigation
- Test on mobile (375px) and desktop (1440px)
- Keep dialogs focused on one task

### ❌ Don't
- Don't nest dialogs within dialogs
- Don't make dialogs too wide (>1200px)
- Don't put too much content (causes excessive scrolling)
- Don't forget to handle ESC key close
- Don't use custom modal implementations
- Don't skip DialogHeader/DialogBody/DialogFooter structure

---

## Troubleshooting

### Dialog doesn't close on ESC
- Make sure you're using `onOpenChange` prop correctly
- Check that you're updating the state when `newOpen` is `false`

### Content not scrolling
- Ensure you're using `<DialogBody>` for scrollable content
- Don't put content outside DialogBody

### Mobile full-screen not working
- Dialog automatically goes full-screen on <640px
- Don't override with custom width classes

### Focus not trapped
- This is built-in via Radix UI
- If it's not working, check for portal/z-index conflicts

---

## Examples in Codebase

See real-world usage in:
- `vitereact/src/components/views/UV_AdminMenuBuilderSettings.tsx`
  - Add Item modal (lines ~1024-1162)
  - Create/Edit Step modal (lines ~822-1021)
  - Delete confirmations (lines ~1165+)

---

## Resources

- **Radix UI Dialog Docs**: https://www.radix-ui.com/docs/primitives/components/dialog
- **Component Location**: `vitereact/src/components/ui/dialog.tsx`
- **QA Checklist**: `MENU_BUILDER_MODAL_QA_CHECKLIST.md`
- **Implementation Summary**: `MENU_BUILDER_MODAL_FIX_SUMMARY.md`
