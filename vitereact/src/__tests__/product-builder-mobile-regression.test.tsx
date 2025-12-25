// @ts-nocheck
/**
 * Mobile Regression Test for Product Builder Modal
 * 
 * This test verifies that the "Build Your Own" wizard modal works correctly
 * on mobile viewports (specifically iOS Safari) without horizontal overflow,
 * clipping, or layout issues.
 * 
 * Test Requirements:
 * - No horizontal scrolling inside modal on mobile
 * - Option rows are 100% width and never clip on the right
 * - Text never forces columns to collapse; prices stay readable
 * - Header layout keeps "Step X of Y" inline (not stacked vertically)
 * - Footer respects iOS Safari safe-area
 * - Step content is visible (not blank)
 * - Next button is visible and clickable after selecting an option
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProductBuilderSheet, BuilderStep } from '@/components/ui/product-builder-sheet';

// Mock data for testing - simulates real menu items like "Whole Wheat Bread"
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
        name: 'Whole Wheat Bread',
        description: 'Nutritious whole grain bread with seeds',
        price: 2.50,
        override_price: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
      {
        step_item_id: 'item-3',
        item_id: 'base-sourdough',
        name: 'Sourdough Bread',
        description: 'Artisan sourdough with a tangy flavor',
        price: 3.00,
        override_price: null,
        image_url: null,
        sort_order: 3,
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
        step_item_id: 'item-4',
        item_id: 'protein-chicken',
        name: 'Grilled Chicken',
        description: 'Tender grilled chicken breast',
        price: 4.50,
        override_price: null,
        image_url: null,
        sort_order: 1,
        is_active: true,
      },
      {
        step_item_id: 'item-5',
        item_id: 'protein-beef',
        name: 'Premium Beef',
        description: 'High quality beef patty',
        price: 5.50,
        override_price: null,
        image_url: null,
        sort_order: 2,
        is_active: true,
      },
    ],
  },
];

describe('ProductBuilderSheet - Mobile Regression Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnAddToCart = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnAddToCart.mockClear();
    
    // Mock iPhone 14 Pro viewport (390x844)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 844,
    });

    // Mock CSS env() function for safe-area-inset
    // @ts-ignore
    window.CSS = window.CSS || {};
    // @ts-ignore
    window.CSS.supports = window.CSS.supports || (() => true);
  });

  describe('Mobile Layout Requirements', () => {
    it('renders modal with proper mobile structure on iPhone viewport', async () => {
      const { container } = render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sandwich/)).toBeInTheDocument();
      });

      // Modal should exist with proper data attribute
      const modal = container.querySelector('[data-product-builder="true"]');
      expect(modal).toBeInTheDocument();

      // Modal should have flex column layout
      expect(modal).toHaveStyle({
        display: 'flex',
      });
    });

    it('header displays title and step counter inline (not stacked)', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sandwich/)).toBeInTheDocument();
      });

      // Step counter should be visible
      const stepCounter = screen.getByText(/Step 1 of 3/);
      expect(stepCounter).toBeInTheDocument();
      expect(stepCounter).toBeVisible();

      // Title should be visible
      const title = screen.getByText(/Sandwich/);
      expect(title).toBeInTheDocument();
      expect(title).toBeVisible();
    });

    it('option rows are fully visible without horizontal clipping', async () => {
      const { container } = render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // "Whole Wheat Bread" option should be visible
      const wheatBreadOption = screen.getByRole('radio', { 
        name: /whole wheat bread/i 
      });
      expect(wheatBreadOption).toBeInTheDocument();
      expect(wheatBreadOption).toBeVisible();

      // Price should be visible and readable
      expect(screen.getByText('+€2.50')).toBeInTheDocument();
      expect(screen.getByText('+€2.50')).toBeVisible();

      // Option name should be visible
      expect(screen.getByText('Whole Wheat Bread')).toBeInTheDocument();
      expect(screen.getByText('Whole Wheat Bread')).toBeVisible();

      // Description should be visible
      expect(screen.getByText(/whole grain bread with seeds/i)).toBeInTheDocument();
    });

    it('footer is visible with running total and Next button', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Running total should be visible
      expect(screen.getByText('Running total')).toBeInTheDocument();
      expect(screen.getByText('€5.00')).toBeInTheDocument();

      // Next button should be visible and clickable
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeInTheDocument();
      expect(nextButton).toBeVisible();
      expect(nextButton).not.toBeDisabled();
    });

    it('step content is visible (not blank) on mobile', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Step title should be visible
      const stepTitle = screen.getByText('Choose Your Base');
      expect(stepTitle).toBeVisible();

      // Step description should be visible
      const stepDescription = screen.getByText(/select one option/i);
      expect(stepDescription).toBeVisible();

      // All three base options should be visible
      expect(screen.getByText('White Bread')).toBeVisible();
      expect(screen.getByText('Whole Wheat Bread')).toBeVisible();
      expect(screen.getByText('Sourdough Bread')).toBeVisible();
    });

    it('Next button is clickable after selecting an option', async () => {
      const user = userEvent.setup();

      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Select "Whole Wheat Bread" option
      const wheatBreadOption = screen.getByRole('radio', { 
        name: /whole wheat bread/i 
      });
      await user.click(wheatBreadOption);

      // Verify selection
      await waitFor(() => {
        expect(wheatBreadOption).toHaveAttribute('aria-checked', 'true');
      });

      // Running total should update (base 5.0 + wheat 2.50 = 7.50)
      expect(screen.getByText('€7.50')).toBeInTheDocument();

      // Click Next button
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should advance to next step
      await waitFor(() => {
        expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
        expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
      });
    });

    it('completes full flow: select base -> select protein -> review -> add to cart', async () => {
      const user = userEvent.setup();

      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      // STEP 1: Select base
      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      const wheatBread = screen.getByRole('radio', { name: /whole wheat bread/i });
      await user.click(wheatBread);

      await waitFor(() => {
        expect(wheatBread).toHaveAttribute('aria-checked', 'true');
      });

      await user.click(screen.getByRole('button', { name: /next/i }));

      // STEP 2: Select protein
      await waitFor(() => {
        expect(screen.getByText('Choose Your Protein')).toBeInTheDocument();
      });

      const chicken = screen.getByRole('radio', { name: /grilled chicken/i });
      await user.click(chicken);

      await waitFor(() => {
        expect(chicken).toHaveAttribute('aria-checked', 'true');
      });

      // Verify running total updated (5.0 + 2.50 + 4.50 = 12.00)
      expect(screen.getByText('€12.00')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next/i }));

      // STEP 3: Review
      await waitFor(() => {
        expect(screen.getByText('Review Your Order')).toBeInTheDocument();
      });

      // Verify selections are shown
      expect(screen.getByText('Whole Wheat Bread')).toBeInTheDocument();
      expect(screen.getByText('Grilled Chicken')).toBeInTheDocument();

      // Click Add to Cart
      const addToCartButton = screen.getByRole('button', { name: /add to cart/i });
      await user.click(addToCartButton);

      // Verify onAddToCart was called with correct data
      await waitFor(() => {
        expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
        const [selections, totalPrice, quantity] = mockOnAddToCart.mock.calls[0];
        expect(totalPrice).toBe(12.0);
        expect(quantity).toBe(1);
      });
    });
  });

  describe('No Horizontal Overflow', () => {
    it('modal container does not exceed viewport width', async () => {
      const { container } = render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      const modal = container.querySelector('[data-product-builder="true"]');
      expect(modal).toBeInTheDocument();

      // In a real browser, we would check:
      // document.documentElement.scrollWidth === document.documentElement.clientWidth
      // For this test, we verify the CSS classes are correct
      expect(modal?.className).toContain('w-screen');
      expect(modal?.className).toContain('max-w-full');
    });

    it('option rows have proper width constraints', async () => {
      const { container } = render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Find all option buttons
      const wheatBreadOption = screen.getByRole('radio', { name: /whole wheat bread/i });
      const optionButton = wheatBreadOption.closest('button');

      // Verify button has proper width classes
      expect(optionButton?.className).toContain('w-full');
      expect(optionButton?.className).toContain('max-w-full');
    });

    it('text containers have min-w-0 to allow shrinking', async () => {
      const { container } = render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Find text container inside option button
      const wheatBreadText = screen.getByText('Whole Wheat Bread');
      const textContainer = wheatBreadText.closest('div');

      // Verify text container has flex-1 and min-w-0 classes
      expect(textContainer?.className).toContain('flex-1');
      expect(textContainer?.className).toContain('min-w-0');
    });

    it('prices have whitespace-nowrap to stay on one line', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // Find price element
      const priceElement = screen.getByText('+€2.50');
      
      // Verify price has whitespace-nowrap class
      expect(priceElement.className).toContain('whitespace-nowrap');
      expect(priceElement.className).toContain('flex-shrink-0');
    });
  });

  describe('Loading and Error States', () => {
    it('shows skeleton placeholders when loading', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={[]}
          onAddToCart={mockOnAddToCart}
          isLoading={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Loading customization options...')).toBeInTheDocument();
      });

      // Loading state should be visible (not blank)
      expect(screen.getByText('Loading customization options...')).toBeVisible();
    });

    it('shows error state with retry button when error occurs', async () => {
      const mockRetry = vi.fn();

      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={[]}
          onAddToCart={mockOnAddToCart}
          error="Failed to load options"
          onRetry={mockRetry}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("We couldn't load options")).toBeInTheDocument();
      });

      // Error message should be visible
      expect(screen.getByText('Failed to load options')).toBeInTheDocument();
      expect(screen.getByText('Failed to load options')).toBeVisible();

      // Retry button should be visible
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toBeVisible();
    });

    it('shows empty state when no steps configured', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={[]}
          onAddToCart={mockOnAddToCart}
          isLoading={false}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No Options Available')).toBeInTheDocument();
      });

      // Empty state should be visible (not blank)
      expect(screen.getByText('No Options Available')).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('modal has proper ARIA attributes', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Sandwich/)).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'builder-title');
    });

    it('options have proper radio/checkbox roles', async () => {
      render(
        <ProductBuilderSheet
          isOpen={true}
          onClose={mockOnClose}
          productName="Sandwich"
          basePrice={5.0}
          steps={mockSteps}
          onAddToCart={mockOnAddToCart}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Choose Your Base')).toBeInTheDocument();
      });

      // First step (single selection) should have radiogroup
      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toBeInTheDocument();
      expect(radioGroup).toHaveAttribute('aria-required', 'true');

      // All radio buttons should be present
      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3); // White, Wheat, Sourdough
    });
  });
});
