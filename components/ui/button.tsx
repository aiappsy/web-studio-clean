
import { cn } from "@/lib/utils";

export function Button({ className = "", ...props }) {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded bg-black text-white dark:bg-white dark:text-black transition",
        className
      )}
      {...props}
    />
  );
}
