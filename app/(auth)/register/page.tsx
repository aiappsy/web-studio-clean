
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [error,setError]=useState('');

  async function handleSubmit(e){
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/register', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data = await res.json();
    if(!data.success){
      setError(data.error || 'Registration failed');
      return;
    }
    router.push('/login');
  }

  return (
    <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-6 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Name"
          value={name}
          onChange={e=>setName(e.target.value)}
        />
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e=>setEmail(e.target.value)}
        />
        <input
          className="w-full border px-3 py-2 rounded"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e=>setPassword(e.target.value)}
        />
        <button className="w-full bg-black text-white py-2 rounded">Register</button>
      </form>
      <p className="text-sm mt-4">
        Have an account? <a href="/login" className="text-blue-500">Login</a>
      </p>
    </div>
  );
}
