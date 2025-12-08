
export function Dialog({ children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">{children}</div>
    </div>
  );
}
