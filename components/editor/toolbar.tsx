
export default function Toolbar() {
  return (
    <div className="h-12 bg-white dark:bg-gray-900 border-b flex items-center gap-4 px-4">
      <button className="px-3 py-1 bg-black text-white rounded">Save</button>
      <button className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">AI Assist</button>
    </div>
  );
}
