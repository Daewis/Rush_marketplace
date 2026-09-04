import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-all duration-200",
        outline: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
        secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-slate-700",
        destructive: "bg-red-50 text-red-600 hover:bg-red-100 border-red-200",
        link: "text-amber-600 underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]",
        glass: "bg-white/80 backdrop-blur-md border border-slate-200 text-slate-800 hover:bg-white",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs",
        sm: "h-8 gap-1 rounded-md px-3 text-[0.8rem]",
        lg: "h-10 gap-1.5 px-4 text-base",
        xl: "h-12 gap-2 px-5 text-base",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
