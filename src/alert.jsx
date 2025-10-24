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
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div 
      ref={ref}
      className={`border rounded-md p-4 ${getVariantClasses()} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
});

export const AlertTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h5 
    ref={ref}
    className={`font-medium mb-1 ${className}`} 
    {...props} 
  />
));

export const AlertDescription = React.forwardRef(({ className = '', ...props }, ref) => (
  <div 
    ref={ref}
    className={`text-sm ${className}`} 
    {...props} 
  />
));

Alert.displayName = 'Alert';
AlertTitle.displayName = 'AlertTitle';
AlertDescription.displayName = 'AlertDescription';
