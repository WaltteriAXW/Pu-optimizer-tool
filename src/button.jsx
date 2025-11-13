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
        return 'bg-accent-red text-white hover:shadow-[0_0_16px_rgba(255,59,92,0.3)] active:transform active:scale-[0.98] border border-accent-red/30 transition-all duration-200';
      case 'outline':
        return 'border-2 bg-transparent text-neutral-light dark:text-neutral-light hover:bg-accent-cyan/10 hover:border-accent-cyan/60 border-accent-cyan/30 transition-all duration-200';
      case 'ghost':
        return 'bg-transparent text-neutral-light dark:text-neutral-light hover:bg-neutral-medium dark:hover:bg-neutral-medium transition-all duration-200';
      case 'success':
        return 'bg-accent-green text-white hover:shadow-[0_0_16px_rgba(0,208,132,0.3)] active:transform active:scale-[0.98] border border-accent-green/30 transition-all duration-200';
      case 'warning':
        return 'bg-accent-orange text-white hover:shadow-[0_0_16px_rgba(255,107,53,0.3)] active:transform active:scale-[0.98] border border-accent-orange/30 transition-all duration-200';
      case 'primary':
        return 'bg-accent-cyan text-neutral-dark hover:shadow-[0_0_16px_rgba(0,217,255,0.3)] active:transform active:scale-[0.98] border border-accent-cyan/30 font-semibold transition-all duration-200';
      default:
        return 'bg-accent-cyan text-neutral-dark hover:shadow-[0_0_16px_rgba(0,217,255,0.3)] active:transform active:scale-[0.98] border border-accent-cyan/30 font-semibold transition-all duration-200';
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
