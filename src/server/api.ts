import { headers } from 'next/headers';
import { appRouter } from './routers/_app';
import { createTRPCContext } from './trpc';

export const serverClient = async () => {
  const headersList = await headers();
  const ctx = await createTRPCContext({ headers: headersList });
  return appRouter.createCaller(ctx);
}; 