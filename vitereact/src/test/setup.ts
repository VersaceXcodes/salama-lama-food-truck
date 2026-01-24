import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Set up window.scrollTo for jsdom
window.scrollTo = vi.fn();

// Set up Element.scrollTo for jsdom
Element.prototype.scrollTo = vi.fn();

// Set up matchMedia for responsive queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

