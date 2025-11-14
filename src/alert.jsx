/* eslint-disable react/prop-types */
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
      return 'border-l-4 border-l-accent-red text-neutral-light modal-error';
    case 'warning':
      return 'border-l-4 border-l-accent-orange text-neutral-light modal-warning';
    case 'success':
      return 'border-l-4 border-l-accent-green text-neutral-light modal-success';
    default:
      return 'border-l-4 border-l-accent-cyan text-neutral-light';
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
