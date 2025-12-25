// @ts-nocheck
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProductBuilderSheet, BuilderStep } from '@/components/ui/product-builder-sheet';

// Mock data for testing
const mockSteps: BuilderStep[] = [
  {
    step_id: 'step-1',
    step_name: 'Choose Your Base',
    step_key: 'base',
    step_type: 'single',
    is_required: true,
    min_selections: 1,
    max_selections: 1,
    sort_order: 1,
    items: [
      {
        step_item_id: 'item-1',
        item_id: 'base-white',
        name: 'White Bread',
        description: 'Fresh white bread',
        price: 0,
        override_price: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
      },
      {
        step_item_id: 'item-2',
        item_id: 'base-wheat',
        name: 'Wheat Bread',
        description: 'Whole wheat bread',
        price: 0.5,
        override_price: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
    ],
  },
  {
    step_id: 'step-2',
    step_name: 'Choose Your Protein',
    step_key: 'protein',
    step_type: 'single',
    is_required: true,
    min_selections: 1,
    max_selections: 1,
    sort_order: 2,
    items: [
      {
        step_item_id: 'item-3',
        item_id: 'protein-chicken',
        name: 'Chicken',
        description: 'Grilled chicken',
        price: 2.0,
        override_price: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
      },
      {
        step_item_id: 'item-4',
        item_id: 'protein-beef',
        name: 'Beef',
        description: 'Premium beef',
        price: 3.0,
        override_price: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
    ],
  },
  {
    step_id: 'step-3',
    step_name: 'Add Toppings',
    step_key: 'toppings',
    step_type: 'multiple',
    is_required: false,
    min_selections: 0,
    max_selections: 3,
    sort_order: 3,
    items: [
      {
        step_item_id: 'item-5',
        item_id: 'topping-lettuce',
        name: 'Lettuce',
        description: 'Fresh lettuce',
        price: 0,
        override_price: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
      },
      {
        step_item_id: 'item-6',
        item_id: 'topping-tomato',
        name: 'Tomato',
        description: 'Sliced tomatoes',
        price: 0.5,
        override_price: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
    ],
  },
];

describe('ProductBuilderSheet - Mobile Modal Flow', () => {
  const mockOnClose = vi.fn();
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAddToCart.mockClear();
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390, // iPhone 14 Pro width
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 844, // iPhone 14 Pro height
    });
  });

  it('renders modal with first step and shows Next button', async () => {
    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    // Wait for modal to render
    await waitFor(() => {
      expect(screen.getByText('Build Your Test Sandwich')).toBeInTheDocument();
    });

    // Verify first step is shown
    expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();

    // Verify Next button is present
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();
    expect(nextButton).toBeVisible();
  });

  it('shows running total in footer', async () => {
    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Running total')).toBeInTheDocument();
    });

    // Initial running total should be base price
    expect(screen.getByText('€5.00')).toBeInTheDocument();
  });

  it('completes full wizard flow: select base -> select protein -> review -> add to cart', async () => {
    const user = userEvent.setup();

    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    // ============================================
    // STEP 1: Select Base
    // ============================================
    await waitFor(() => {
      expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    });

    // Click on White Bread option
    const whiteBreadOption = screen.getByRole('radio', { name: /white bread/i });
    await user.click(whiteBreadOption);

    // Verify selection is checked
    await waitFor(() => {
      expect(whiteBreadOption).toHaveAttribute('aria-checked', 'true');
    });

    // Click Next to go to step 2
    const nextButton1 = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton1);

    // ============================================
    // STEP 2: Select Protein
    // ============================================
    await waitFor(() => {
      expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    // Click on Chicken option
    const chickenOption = screen.getByRole('radio', { name: /chicken/i });
    await user.click(chickenOption);

    // Verify selection is checked
    await waitFor(() => {
      expect(chickenOption).toHaveAttribute('aria-checked', 'true');
    });

    // Verify running total updated (base 5.0 + chicken 2.0 = 7.0)
    expect(screen.getByText('€7.00')).toBeInTheDocument();

    // Click Next to go to step 3
    const nextButton2 = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton2);

    // ============================================
    // STEP 3: Add Toppings (optional)
    // ============================================
    await waitFor(() => {
      expect(screen.getByText('Add Toppings')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    // Skip toppings (optional step) - just click Next
    const nextButton3 = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton3);

    // ============================================
    // STEP 4: Review and Add to Cart
    // ============================================
    await waitFor(() => {
      expect(screen.getByText('Review Your Order')).toBeInTheDocument();
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    });

    // Verify selections are shown
    expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    expect(screen.getByText('White Bread')).toBeInTheDocument();
    expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
    expect(screen.getByText('Chicken')).toBeInTheDocument();

    // Verify total price appears
    const totals = screen.getAllByText('€7.00');
    expect(totals.length).toBeGreaterThan(0);

    // Click Add to Cart
    const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
    await user.click(addToCartButton);

    // Verify onAddToCart was called with correct data
    await waitFor(() => {
      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
      const [selections, totalPrice, quantity] = mockOnAddToCart.mock.calls[0];
      expect(totalPrice).toBe(7.0);
      expect(quantity).toBe(1);
      expect(selections).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            step_key: 'base',
            items: expect.arrayContaining([
              expect.objectContaining({
                item_id: 'base-white',
                name: 'White Bread',
              }),
            ]),
          }),
          expect.objectContaining({
            step_key: 'protein',
            items: expect.arrayContaining([
              expect.objectContaining({
                item_id: 'protein-chicken',
                name: 'Chicken',
              }),
            ]),
          }),
        ])
      );
    });
  }, 30000);

  it('shows validation error when trying to skip required step', async () => {
    const user = userEvent.setup();

    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    });

    // Try to click Next without selecting anything
    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/please select an option to continue/i)).toBeInTheDocument();
    });

    // Should still be on step 1
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('allows going back to previous step', async () => {
    const user = userEvent.setup();

    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    // Select base and go to next step
    await waitFor(() => {
      expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    });

    const whiteBreadOption = screen.getByRole('radio', { name: /white bread/i });
    await user.click(whiteBreadOption);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Now on step 2
    await waitFor(() => {
      expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    });

    // Click Back button
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    // Should be back on step 1
    await waitFor(() => {
      expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    // Previous selection should still be selected
    const whiteBreadOptionAgain = screen.getByRole('radio', { name: /white bread/i });
    expect(whiteBreadOptionAgain).toHaveAttribute('aria-checked', 'true');
  });

  it('updates quantity in review step', async () => {
    const user = userEvent.setup();

    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    // Quick navigation to review step
    // Step 1: Select base
    await waitFor(() => {
      expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
    });
    const whiteBread = screen.getByRole('radio', { name: /white bread/i });
    await user.click(whiteBread);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Select protein
    await waitFor(() => {
      expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
    });
    const chicken = screen.getByRole('radio', { name: /chicken/i });
    await user.click(chicken);
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Skip toppings
    await waitFor(() => {
      expect(screen.getByText('Add Toppings')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: Review - update quantity
    await waitFor(() => {
      expect(screen.getByText('Review Your Order')).toBeInTheDocument();
    });

    // Initial quantity should be 1
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Check for the initial total - use getAllByText since "€7.00" appears twice
    const initialTotals = screen.getAllByText('€7.00');
    expect(initialTotals.length).toBeGreaterThan(0);

    // Find the + button (it's the second button in the quantity selector)
    const quantitySection = screen.getByText('Quantity').closest('div');
    const buttons = within(quantitySection as HTMLElement).getAllByRole('button');
    const plusButton = buttons[1]; // Second button is the + button

    // Click + to increase quantity
    await user.click(plusButton);

    // Quantity should now be 2
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      // Total should now be €14.00
      const updatedTotals = screen.getAllByText('€14.00');
      expect(updatedTotals.length).toBeGreaterThan(0);
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Build Your Test Sandwich')).toBeInTheDocument();
    });

    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Verify onClose was called
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', async () => {
    render(
      <ProductBuilderSheet
        isOpen={true}
        onClose={mockOnClose}
        productName="Test Sandwich"
        basePrice={5.0}
        steps={mockSteps}
        onAddToCart={mockOnAddToCart}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Build Your Test Sandwich')).toBeInTheDocument();
    });

    // Modal should have proper ARIA attributes
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'builder-title');

    // Step content should have proper radiogroup/group role
    const firstStepOptions = screen.getByRole('radiogroup');
    expect(firstStepOptions).toBeInTheDocument();
    expect(firstStepOptions).toHaveAttribute('aria-required', 'true');
  });
});
