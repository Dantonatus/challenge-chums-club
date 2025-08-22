import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-300 text-white font-medium rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:from-blue-600 hover:via-blue-500 hover:to-emerald-400 active:translate-y-0 active:shadow-md focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 disabled:grayscale disabled:hover:translate-y-0 disabled:hover:shadow-lg transition-all duration-200 ease-in-out motion-reduce:hover:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-[var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elegant)] hover:brightness-110",
        cta: "rounded-full bg-[var(--gradient-cta)] text-[hsl(var(--cta-foreground))] ring-1 ring-primary/25 shadow-[var(--shadow-elegant)] hover:brightness-110 active:scale-[0.98]",
        ctaOutline: "rounded-full bg-background text-primary ring-2 ring-primary/30 hover:bg-muted shadow-[var(--shadow-elegant)]/30 active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-full px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
