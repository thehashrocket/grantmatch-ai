import type {
	Prisma,
	Grant,
	GrantDetail,
	GrantAttachment,
} from '@/prisma/generated/client';

export type DetailUpsert =
	| Prisma.GrantDetailUncheckedCreateInput
	| Prisma.GrantDetailUncheckedUpdateInput;
export type AttachmentCreate = Prisma.GrantAttachmentCreateManyInput;

export type GrantWithRelations = Grant & {
	details?: GrantDetail | null;
	attachments?: GrantAttachment[];
};

export type GrantDetailsResult = {
	detail: Partial<Prisma.GrantDetailUncheckedCreateInput>;
	attachments: Omit<Prisma.GrantAttachmentCreateManyInput, 'grantId'>[];
	grantPatch?: Partial<Prisma.GrantUncheckedUpdateInput>;
	raw?: unknown;
};

export interface GrantDetailFetcher {
	endpoint: string;
	fetch(
		grant: GrantWithRelations,
		opts?: { timeoutMs?: number },
	): Promise<GrantDetailsResult>;
}
