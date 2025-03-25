import { serverClient } from '@/server/api';

export default async function ServerPage() {
  const greeting = await serverClient().then(client => 
    client.hello({ name: 'Server Component' })
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Server Component Example</h1>
        <p className="text-xl">{greeting.greeting}</p>
      </div>
    </main>
  );
} 