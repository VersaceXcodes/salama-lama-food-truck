import React from 'react';

interface BrandLogoProps {
  variant?: 'header' | 'footer';
  className?: string;
}

/**
 * BrandLogo Component
 * 
 * A reusable, production-safe logo component that uses absolute paths from /public.
 * 
 * Variants:
 * - header: Optimized for navbar display (26-30px mobile, 32-36px desktop)
 * - footer: Optimized for footer display (slightly larger, centered)
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'header', className = '' }) => {
  // Base styles for both variants
  const baseStyles = {
    width: 'auto',
    objectFit: 'contain' as const,
  };
  
  // Variant-specific styles
  const variantStyles = variant === 'header' 
    ? {
        height: '28px', // Mobile-first: 26-30px range
        maxWidth: '160px',
      }
    : {
        height: '120px', // Footer: larger display
        maxHeight: '120px',
        opacity: 0.9,
      };
  
  // Combine styles
  const combinedStyles = { ...baseStyles, ...variantStyles };
  
  // Variant-specific classes
  const variantClasses = variant === 'header'
    ? 'transition-transform duration-200 group-hover:scale-105'
    : '';
  
  return (
    <img
      src="/brand/salama-lama-logo.png"
      alt="Salama Lama"
      loading={variant === 'header' ? 'eager' : 'lazy'}
      decoding="async"
      style={combinedStyles}
      className={`${variantClasses} ${className}`.trim()}
      onError={(e) => {
        // Graceful fallback: hide broken image icon
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        console.error('Failed to load Salama Lama logo');
      }}
    />
  );
};

export default BrandLogo;
