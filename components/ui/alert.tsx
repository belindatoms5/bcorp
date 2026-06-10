import * as React from "react";
import { cn } from "@/lib/utils";

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "destructive" | "warning" }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "relative w-full rounded-lg border p-4 text-sm",
        variant === "default" && "border-gray-200 bg-gray-50 text-gray-800",
        variant === "destructive" && "border-red-200 bg-red-50 text-red-800",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-800",
        className
      )}
      {...props}
    />
  )
);
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm", className)} {...props} />
  )
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };
