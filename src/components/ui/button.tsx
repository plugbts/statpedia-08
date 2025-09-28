import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { useSoundHaptic } from "@/hooks/use-sound-haptic";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-heading font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover-3d glow-effect",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground shadow-3d hover:shadow-glow animate-neon-pulse",
        destructive: "bg-destructive text-destructive-foreground shadow-3d hover:bg-destructive/90",
        outline: "border border-input bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground shadow-3d",
        secondary: "bg-secondary text-secondary-foreground shadow-3d hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground transition-all duration-300",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
        success: "bg-gradient-success text-success-foreground shadow-3d hover:shadow-success",
        accent: "bg-gradient-accent text-accent-foreground shadow-3d hover:shadow-neon-purple",
        premium: "bg-gradient-glass border border-glass-border backdrop-blur-sm text-foreground shadow-3d hover:shadow-glow",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
    const { playInteraction } = useSoundHaptic();
    const Comp = asChild ? Slot : "button";
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      playInteraction('click');
      props.onClick?.(e);
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      playInteraction('hover');
      props.onMouseEnter?.(e);
    };

    return (
      <Comp 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={ref} 
        {...props}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
