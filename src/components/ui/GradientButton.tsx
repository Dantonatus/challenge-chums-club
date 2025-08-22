import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const gradientButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-white font-semibold tracking-tight ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 motion-reduce:hover:translate-y-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-[#1E90FF] via-[#2EA7F8] to-[#25C3B0] hover:from-[#1E90FF] hover:via-[#2EA7F8] hover:to-[#20B2AA] shadow-[0_10px_20px_rgba(30,144,255,0.2)] hover:shadow-xl hover:-translate-y-0.5 active:shadow-inner active:translate-y-0",
        outline: "border-2 border-gradient bg-transparent text-[#1E90FF] hover:bg-gradient-to-r hover:from-[#1E90FF] hover:via-[#2EA7F8] hover:to-[#25C3B0] hover:text-white hover:border-transparent",
      },
      size: {
        default: "h-12 px-6 text-base [&_svg]:size-4",
        sm: "h-10 px-4 text-sm [&_svg]:size-4",
        lg: "h-14 px-8 text-lg [&_svg]:size-5",
        icon: "h-12 w-12",
      },
      radius: {
        default: "rounded-xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "full",
    },
  }
)

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  asChild?: boolean
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ className, variant, size, radius, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(gradientButtonVariants({ variant, size, radius, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
GradientButton.displayName = "GradientButton"

export { GradientButton, gradientButtonVariants }