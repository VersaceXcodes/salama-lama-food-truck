import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOverlayState } from '@/hooks/use-overlay-state';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxHeight?: string;
  overlayType?: 'mobile-menu' | 'filter' | 'customization' | 'cart-drawer' | 'checkout-modal';
}

/**
 * BottomSheet Component
 * 
 * A mobile-optimized bottom sheet that slides up from the bottom.
 * Perfect for filters, modals, and product customizations on mobile.
 * - Scrollable content area
 * - Sticky header and footer
 * - Pull handle indicator
 * - Prevents background scroll
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
  maxHeight = '90vh',
  overlayType = 'filter',
}) => {
  const { openOverlay, closeOverlay } = useOverlayState();

  // Notify overlay state and lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      openOverlay(overlayType);
      document.body.style.overflow = 'hidden';
    } else {
      closeOverlay();
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      closeOverlay();
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, openOverlay, closeOverlay, overlayType]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 bg-white 
          rounded-t-[var(--radius-xl)] shadow-2xl z-[101]
          flex flex-col animate-slide-up
          ${className}
        `}
        style={{ 
          maxHeight,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
      >
        {/* Pull Handle Indicator */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-[var(--accent-color)] rounded-full opacity-50" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="sticky top-0 bg-white border-b border-[var(--border-light)] px-4 sm:px-6 py-4 flex items-center justify-between">
            <h2 
              id="sheet-title"
              className="text-xl font-bold text-[var(--primary-text)]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-[var(--primary-text)] hover:bg-[var(--primary-bg)] rounded-lg transition-colors"
              style={{ minHeight: 'var(--tap-target-min)', minWidth: 'var(--tap-target-min)' }}
              aria-label="Close"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          {children}
        </div>
        
        {/* Footer (Sticky at bottom) */}
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-[var(--border-light)] px-4 sm:px-6 py-4">
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default BottomSheet;
