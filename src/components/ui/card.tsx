import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.ComponentProps<"div"> {
  size?: "default" | "sm";
  elevation?: "flat" | "elevated" | "glass";
}

function Card({
  className,
  size = "default",
  elevation = "flat",
  ...props
}: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-elevation={elevation}
      className={cn(
        "group/card flex flex-col overflow-hidden rounded-xl bg-white text-sm text-slate-800 shadow-sm border border-slate-200 transition-all duration-200",
        elevation === "flat" && "border-slate-200",
        elevation === "elevated" && "shadow-md hover:shadow-lg border-slate-200",
        elevation === "glass" && "bg-white/80 backdrop-blur-md border-white/20",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col space-y-1.5 p-6 pb-3", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-semibold text-base text-slate-900 tracking-tight leading-none",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-slate-500", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("ml-auto flex items-center", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center p-6 pt-0 border-t border-slate-100 mt-auto",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
