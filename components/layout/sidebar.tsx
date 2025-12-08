
'use client';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white dark:bg-gray-900 border-r p-4 space-y-2">
      <h2 className="font-bold text-xl mb-4">WebStudio</h2>
      <nav className="space-y-2">
        <a href="/dashboard" className="block">Dashboard</a>
        <a href="/projects" className="block">Projects</a>
        <a href="/settings" className="block">Settings</a>
      </nav>
    </aside>
  );
}
