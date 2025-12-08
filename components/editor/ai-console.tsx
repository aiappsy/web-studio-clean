
'use client';

import { useState } from 'react';

export default function AiConsole() {
  const [input, setInput] = useState("");
  return (
    <div className="border-t bg-gray-50 dark:bg-black p-4">
      <textarea
        className="w-full border rounded p-2 bg-white dark:bg-gray-800 text-black dark:text-white"
        placeholder="Ask AI to modify..."
        value={input}
        onChange={(e)=>setInput(e.target.value)}
      />
      <button className="mt-2 px-4 py-2 bg-black text-white rounded">Apply</button>
    </div>
  );
}
