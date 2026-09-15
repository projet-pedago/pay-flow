import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-sage focus:ring-4 focus:ring-sage/10",
        className,
      )}
      {...props}
    />
  );
}
