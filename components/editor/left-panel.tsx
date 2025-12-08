
export default function LeftPanel() {
  return (
    <aside className="w-64 border-r bg-white dark:bg-gray-900 p-4">
      <h3 className="font-bold mb-2">Components</h3>
      <div className="space-y-2">
        <button className="block w-full text-left">Heading</button>
        <button className="block w-full text-left">Paragraph</button>
      </div>
    </aside>
  );
}
