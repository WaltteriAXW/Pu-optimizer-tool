import React from 'react';

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${className}`}
    ref={ref}
    {...props}
  />
));

Input.displayName = 'Input';
