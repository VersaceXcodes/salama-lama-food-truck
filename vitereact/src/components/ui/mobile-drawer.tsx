import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useOverlayState } from '@/hooks/use-overlay-state';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'right' | 'bottom';
  className?: string;
}

/**
 * MobileDrawer Component
 * 
 * A mobile-first drawer/sheet component that slides in from the right or bottom.
 * - Prevents background scroll
 * - Smooth animations
 * - Backdrop click to close
 * - Escape key support
 */
export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  className = '',
}) => {
  const { openOverlay, closeOverlay } = useOverlayState();

  // Notify overlay state and lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      openOverlay('mobile-menu');
      document.body.style.overflow = 'hidden';
    } else {
      closeOverlay();
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      closeOverlay();
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, openOverlay, closeOverlay]);

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

  const positionClasses = {
    right: 'top-0 right-0 bottom-0 w-full max-w-md animate-slide-in-right',
    bottom: 'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[var(--radius-xl)] animate-slide-up',
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div 
        className={`
          fixed bg-white shadow-2xl z-[101] overflow-y-auto
          ${positionClasses[position]}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--border-light)] px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          {title && (
            <h2 
              id="drawer-title"
              className="text-xl font-bold text-[var(--primary-text)]"
            >
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            className="p-2 text-[var(--primary-text)] hover:bg-[var(--primary-bg)] rounded-lg transition-colors"
            style={{ minHeight: 'var(--tap-target-min)', minWidth: 'var(--tap-target-min)' }}
            aria-label="Close drawer"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 sm:px-6 py-6">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
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
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default MobileDrawer;
