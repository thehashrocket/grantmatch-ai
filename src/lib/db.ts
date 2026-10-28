// Single shared Prisma client lives in ./prisma. This alias keeps existing
// `import { db } from '@/lib/db'` call sites working without a second pool.
export { prisma as db } from './prisma';
