'use client';

import { trpc } from '@/lib/trpc/client';

export default function Home() {
  const hello = trpc.hello.useQuery({ name: 'GrantMatchAI User' });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Welcome to GrantMatchAI</h1>
        {hello.isLoading ? (
          <p>Loading...</p>
        ) : (
          <p className="text-xl">{hello.data?.greeting}</p>
        )}
      </div>
    </main>
  );
}
