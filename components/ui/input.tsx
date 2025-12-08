
import { cn } from "@/lib/utils";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={cn(
        "border px-3 py-2 rounded w-full bg-white dark:bg-gray-800 text-black dark:text-white",
        className
      )}
      {...props}
    />
  );
}
