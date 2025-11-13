import React from 'react';

export const Card = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`bg-neutral-medium dark:bg-neutral-medium rounded-lg border shadow-sm transition-all duration-200 hover:shadow-glow-cyan hover:border-accent-cyan/30 ${className}`}
    style={{ borderColor: 'rgba(0, 217, 255, 0.1)' }}
    {...props}
  />
));

export const CardHeader = React.forwardRef(({ className = '', ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 border-b ${className}`}
    style={{ borderColor: 'rgba(0, 217, 255, 0.1)' }}
    {...props}
  />
));

export const CardTitle = React.forwardRef(({ className = '', ...props }, ref) => (
  <h3
    ref={ref}
    className={`text-lg font-semibold ${className}`}
    style={{ color: '#E0E2E9' }}
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
