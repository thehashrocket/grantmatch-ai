// Temporary shim to preserve existing imports. Prefer ensureGrantDetail.
import { ensureGrantDetail } from '@/server/grants/ensureGrantDetail';
import type { PrismaClient } from '@/prisma/generated/client';

export async function ensureFederalGrantDetail(
	prisma: PrismaClient,
	grantId: string,
	opts: { timeoutMs?: number; force?: boolean } = {},
) {
	return ensureGrantDetail(prisma, grantId, opts);
}
