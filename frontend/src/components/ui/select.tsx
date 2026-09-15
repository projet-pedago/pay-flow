import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none transition focus:border-sage focus:ring-4 focus:ring-sage/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
