import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-sm transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-coral text-coral-foreground border-neo border-cafe-text shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active hover:bg-coral-hover active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-lg',
        secondary:
          'bg-cafe-surface text-cafe-text border-neo border-cafe-text shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active hover:bg-cafe-surface-2 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-lg',
        destructive:
          'bg-cancelled text-white border-neo border-cafe-text shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active hover:bg-cancelled/90 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-lg',
        outline:
          'bg-transparent text-cafe-text border-neo border-cafe-text rounded-lg hover:bg-cafe-surface-2 active:bg-coral-soft',
        ghost:
          'text-cafe-text hover:bg-cafe-surface-2 active:bg-coral-soft rounded-lg border-transparent',
        link: 'text-coral underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        xl: 'h-14 px-10 text-lg font-bold',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        touch: 'h-11 px-5 min-w-[44px]', /* 44px touch target for POS */
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
