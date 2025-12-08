
import { cn } from "@/lib/utils";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={cn(
        "border rounded p-4 shadow-sm bg-white dark:bg-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
