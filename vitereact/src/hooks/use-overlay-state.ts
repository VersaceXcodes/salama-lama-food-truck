import { create } from 'zustand';

interface OverlayState {
  isOverlayOpen: boolean;
  overlayType: 'mobile-menu' | 'filter' | 'customization' | 'cart-drawer' | 'checkout-modal' | null;
  openOverlay: (type: 'mobile-menu' | 'filter' | 'customization' | 'cart-drawer' | 'checkout-modal') => void;
  closeOverlay: () => void;
}

/**
 * Overlay State Hook
 * 
 * Tracks when overlays (modals, drawers, bottom sheets) are open
 * so the floating cart bar can be hidden to avoid UI clutter.
 */
export const useOverlayState = create<OverlayState>((set) => ({
  isOverlayOpen: false,
  overlayType: null,
  openOverlay: (type) => set({ isOverlayOpen: true, overlayType: type }),
  closeOverlay: () => set({ isOverlayOpen: false, overlayType: null }),
}));
