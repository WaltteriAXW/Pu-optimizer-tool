import React from 'react';

export const Button = React.forwardRef(({ 
  children, 
  className = '',
  variant = 'default',
  size = 'default',
  ...props 
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'outline':
        return 'border border-gray-300 bg-transparent hover:bg-gray-100';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100';
      default:
        return 'bg-blue-500 text-white hover:bg-blue-600';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-3 py-1';
      case 'lg':
        return 'text-lg px-6 py-3';
      default:
        return 'px-4 py-2';
    }
  };

  return (
    <button
      className={`rounded-md transition-colors ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      ref={ref}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';
