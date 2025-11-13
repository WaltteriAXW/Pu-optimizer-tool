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
        return 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-red-700';
      case 'outline':
        return 'border-2 border-gray-400 dark:border-gray-500 bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
      case 'ghost':
        return 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 border border-green-700';
      case 'warning':
        return 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 border border-amber-700';
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-blue-700';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 border border-blue-700';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm px-3 py-1.5 rounded-md';
      case 'lg':
        return 'text-lg px-6 py-3 rounded-md';
      default:
        return 'px-4 py-2 rounded-md';
    }
  };

  const isDisabled = props.disabled;

  return (
    <button
      className={`font-semibold transition-colors duration-150 ${
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
