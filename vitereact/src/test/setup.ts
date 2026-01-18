import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.scrollTo for jsdom
window.scrollTo = vi.fn();

// Mock Element.scrollTo for jsdom
Element.prototype.scrollTo = vi.fn();

// Mock matchMedia for responsive queries
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

