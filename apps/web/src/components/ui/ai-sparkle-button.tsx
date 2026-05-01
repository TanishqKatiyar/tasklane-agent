"use client";

import type { VariantProps } from "class-variance-authority";
import { Sparkles } from "lucide-react";
import * as React from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Derive ButtonProps from the actual component since button.tsx doesn't export ButtonProps.
type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

interface AiSparkleButtonProps extends ButtonBaseProps {
  isLoading?: boolean;
  pulse?: boolean;
  children?: React.ReactNode;
}

export const AiSparkleButton = React.forwardRef<HTMLButtonElement, AiSparkleButtonProps>(
  ({ className, isLoading, pulse = false, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        className={cn(
          "relative overflow-hidden border-purple-200/50 dark:border-purple-900/50 bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-950/30 dark:hover:to-indigo-950/30 text-purple-700 dark:text-purple-300 shadow-sm transition-all duration-300",
          pulse && "animate-pulse shadow-purple-500/20 shadow-md",
          className,
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <Sparkles className="mr-2 h-4 w-4 animate-spin text-purple-500" />
        ) : (
          <Sparkles className={cn("mr-2 h-4 w-4 text-purple-500", pulse && "animate-bounce")} />
        )}
        <span className="font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
          {children || "AI Assist"}
        </span>
      </Button>
    );
  },
);
AiSparkleButton.displayName = "AiSparkleButton";
