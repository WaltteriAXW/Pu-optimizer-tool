import React from 'react';

export const Card = React.forwardRef(({ className = '', ...props }, ref) => (
  <div 
    ref={ref}
    className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`} 
    {...props} 
  />
));

export const CardHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <div 
    ref={ref}
    className={`p-6 ${className}`} 
    {...props} 
  />
));

export const CardTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h3 
    ref={ref}
    className={`text-xl font-semibold ${className}`} 
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
