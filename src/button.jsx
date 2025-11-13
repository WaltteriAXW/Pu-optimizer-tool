import React from 'react';

export const Button = React.forwardRef(({
  children,
  className = '',
  variant = 'default',
  size = 'default',
  animated = true,
  ...props
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg';
      case 'outline':
        return 'border-2 border-gray-300 dark:border-gray-600 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-400';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg';
      case 'primary':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-xl';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-xl';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-3 py-1.5 rounded-md';
      case 'lg':
        return 'text-lg px-6 py-3 rounded-lg';
      default:
        return 'px-4 py-2 rounded-lg';
    }
  };

  const isDisabled = props.disabled;

  return (
    <button
      className={`font-medium transition-all duration-200 ${
        animated && !isDisabled ? 'btn-3d hover-lift active:scale-95' : ''
      } ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${getVariantClasses()} ${getSizeClasses()} ${className}`}
      ref={ref}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
});

Button.displayName = 'Button';
