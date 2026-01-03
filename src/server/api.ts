import { headers } from 'next/headers';
import { appRouter } from './api/root';
import { createTRPCContext } from './api/trpc';

export const serverClient = async () => {
	const headersList = await headers();
	const ctx = await createTRPCContext({ headers: headersList });
	return appRouter.createCaller(ctx);
};
