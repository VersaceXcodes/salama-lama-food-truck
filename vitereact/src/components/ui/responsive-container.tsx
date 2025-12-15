import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  withBottomPadding?: boolean;
}

/**
 * ResponsiveContainer Component
 * 
 * A consistent container component that applies:
 * - Max width of 1280px (6xl)
 * - Mobile-first responsive padding (16px → 24px → 40px)
 * - Optional bottom padding for floating cart bar
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
  withBottomPadding = false,
}) => {
  return (
    <Component
      className={`
        w-full max-w-[1280px] mx-auto
        px-4 sm:px-6 lg:px-10
        ${withBottomPadding ? 'pb-[calc(var(--bottom-bar-height)+env(safe-area-inset-bottom,0px)+1rem)]' : ''}
        ${className}
      `}
    >
      {children}
    </Component>
  );
};

export default ResponsiveContainer;
