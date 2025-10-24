import React from 'react';

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 ${className}`}
    ref={ref}
    {...props}
  />
));

Input.displayName = 'Input';
