import React, { useState } from 'react';

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
 * - header: Optimized for navbar display (28-32px mobile, 32-36px desktop)
 * - footer: Optimized for footer display (slightly larger, centered)
 */
const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'header', className = '' }) => {
  const [imageError, setImageError] = useState(false);
  
  // Base styles for both variants
  const baseStyles = {
    width: 'auto',
    objectFit: 'contain' as const,
  };
  
  // Variant-specific styles
  const variantStyles = variant === 'header' 
    ? {
        height: '30px', // Mobile-first: 28-32px range
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
  
  // Handle image load error
  const handleError = () => {
    setImageError(true);
    console.error('Failed to load Salama Lama logo');
  };
  
  // Fallback component when image fails to load
  if (imageError) {
    return (
      <div 
        className={`flex items-center justify-center bg-[#D97706] text-white font-bold rounded-full ${className}`.trim()}
        style={{
          width: variant === 'header' ? '32px' : '48px',
          height: variant === 'header' ? '32px' : '48px',
          fontSize: variant === 'header' ? '12px' : '18px',
        }}
        title="Salama Lama"
      >
        SL
      </div>
    );
  }
  
  return (
    <img
      src="/brand/salama-lama-logo.png"
      alt="Salama Lama"
      loading={variant === 'header' ? 'eager' : 'lazy'}
      decoding="async"
      style={combinedStyles}
      className={`${variantClasses} ${className}`.trim()}
      onError={handleError}
    />
  );
};

export default BrandLogo;
