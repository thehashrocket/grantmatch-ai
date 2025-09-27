import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/prisma/generated/client'

type JsonLike = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

// Utility to recursively convert BigInt values to strings
function convertBigIntToString(value: unknown): JsonLike {
  if (Array.isArray(value)) {
    return value.map(convertBigIntToString);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, convertBigIntToString(nestedValue)])
    );
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value as JsonLike;
}

type WebhookData = {
  purpose?: string;
  description?: unknown;
  eligibilityRequirements?: Record<string, unknown>;
  fundingDetails?: Record<string, unknown>;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: grantId } = await context.params;

  // 1. Check for existing GrantDetail
  const existingDetail = await prisma.grantDetail.findUnique({
    where: { grantId },
  });

  // 2. Fetch Grant for portalId and url (always needed for response)
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    include: { details: true },
  });
  if (!grant) {
    return new Response('Grant not found', { status: 404 });
  }

  // If details already exist, return the full grant with details
  if (existingDetail) {
    return Response.json(convertBigIntToString(grant));
  }

  // 3. Prepare webhook payload
  const webhookUrl = process.env.N8N_GRANT_DETAILS_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response('Webhook URL not configured', { status: 500 });
  }

  const payload = {
    grantId: grant.id,
    portalId: grant.portalId,
    url: grant.url,
    webhookUrl,
  };

  // 4. POST to n8n webhook
  let webhookData: WebhookData | undefined;
  try {
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!webhookRes.ok) {
      return new Response('Failed to fetch details from webhook', { status: 502 });
    }
    const webhookArr = await webhookRes.json();
    if (!Array.isArray(webhookArr) || !webhookArr[0]?.output) {
      return new Response('Unexpected webhook response format', { status: 502 });
    }
    // Extract JSON from code block
    const outputStr = webhookArr[0].output;
    const jsonMatch = outputStr.match(/```json\n([\s\S]*)\n```/);
    if (!jsonMatch) {
      return new Response('Could not parse webhook output', { status: 502 });
    }
    webhookData = JSON.parse(jsonMatch[1]) as WebhookData;
  } catch {
    return new Response('Error contacting or parsing webhook', { status: 502 });
  }

  if (!webhookData) {
    return new Response('Webhook data missing', { status: 502 });
  }

  // 5. Save new GrantDetail
  try {
    await prisma.grantDetail.create({
      data: {
        grantId: grantId,
        title: grant.title, // n8n does not return title
        purpose: webhookData.purpose ?? grant.purpose ?? '',
        description: typeof webhookData.description === 'string' ? webhookData.description : JSON.stringify(webhookData.description),
        eligibilityRequirements: (webhookData.eligibilityRequirements ?? {}) as Prisma.InputJsonValue,
        fundingDetails: (webhookData.fundingDetails ?? {}) as Prisma.InputJsonValue,
      },
    });
    // Refetch the grant with details
    const updatedGrant = await prisma.grant.findUnique({
      where: { id: grantId },
      include: { details: true },
    });
    return Response.json(convertBigIntToString(updatedGrant));
  } catch {
    return new Response('Failed to save GrantDetail', { status: 500 });
  }
}
