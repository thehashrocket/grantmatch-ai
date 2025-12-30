import { PrismaClient } from '@/prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error('DATABASE_URL is required to initialize Prisma');
}

const globalForPrisma = globalThis as unknown as {
	prismaPool: Pool | undefined;
	prismaAdapter: PrismaPg | undefined;
	prisma: PrismaClient | undefined;
};

const prismaPool =
	globalForPrisma.prismaPool ??
	new Pool({
		connectionString,
	});

const prismaAdapter = globalForPrisma.prismaAdapter ?? new PrismaPg(prismaPool);

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: prismaAdapter,
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prismaPool = prismaPool;
	globalForPrisma.prismaAdapter = prismaAdapter;
	globalForPrisma.prisma = prisma;
}
