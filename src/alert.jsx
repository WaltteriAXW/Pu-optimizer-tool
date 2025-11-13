import React from 'react';

export const Alert = React.forwardRef(({
  children,
  className = '',
  variant = 'default',
  ...props
}, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-100 border-l-4 border-l-red-700 text-red-900 dark:bg-red-900 dark:border-l-red-500 dark:text-red-100';
      case 'warning':
        return 'bg-amber-100 border-l-4 border-l-amber-700 text-amber-900 dark:bg-amber-900 dark:border-l-amber-500 dark:text-amber-100';
      case 'success':
        return 'bg-green-100 border-l-4 border-l-green-700 text-green-900 dark:bg-green-900 dark:border-l-green-500 dark:text-green-100';
      default:
        return 'bg-blue-100 border-l-4 border-l-blue-700 text-blue-900 dark:bg-blue-900 dark:border-l-blue-500 dark:text-blue-100';
    }
  };

  return (
    <div
      ref={ref}
      className={`rounded-md p-4 ${getVariantClasses()} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

export const AlertTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h5
    ref={ref}
    className={`font-bold mb-2 text-base ${className}`}
    {...props}
  />
));

export const AlertDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`text-sm leading-relaxed ${className}`}
    {...props}
  />
));

Alert.displayName = 'Alert';
AlertTitle.displayName = 'AlertTitle';
AlertDescription.displayName = 'AlertDescription';
