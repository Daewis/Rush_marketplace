import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-slate-300 bg-white flex items-center justify-center transition-all peer-focus:ring-2 peer-focus:ring-amber-500/20 peer-checked:bg-amber-600 peer-checked:border-amber-600 peer-checked:text-white disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
