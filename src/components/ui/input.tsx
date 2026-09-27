import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-[10px] border border-input bg-background/70 px-3 py-1 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:border-ring/60 focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
