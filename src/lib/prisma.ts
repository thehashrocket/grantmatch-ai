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
		// Serverless instances should hold few connections; point DATABASE_URL at
		// the provider's pooler in production. Override with DATABASE_POOL_MAX.
		max: Number(process.env.DATABASE_POOL_MAX) || 5,
		// Release idle connections quickly so frozen instances don't pin slots.
		idleTimeoutMillis: 10_000,
		// Fail fast instead of hanging forever when the DB is unreachable.
		connectionTimeoutMillis: 10_000,
	});

const prismaAdapter = globalForPrisma.prismaAdapter ?? new PrismaPg(prismaPool);

export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		adapter: prismaAdapter,
		log: process.env.NODE_ENV === 'development' ? ['query'] : [],
	});

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prismaPool = prismaPool;
	globalForPrisma.prismaAdapter = prismaAdapter;
	globalForPrisma.prisma = prisma;
}
