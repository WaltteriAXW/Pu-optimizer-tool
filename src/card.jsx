import React from 'react';

export const Card = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-150 ${className}`}
    {...props}
  />
));

export const CardHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`}
    {...props}
  />
));

export const CardTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold text-gray-900 dark:text-gray-100 ${className}`}
    {...props}
  />
));

export const CardContent = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 pt-0 ${className}`}
    {...props}
  />
));

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardContent.displayName = 'CardContent';
