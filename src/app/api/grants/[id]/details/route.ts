import { prisma } from '@/lib/prisma'

// Utility to recursively convert BigInt values to strings
function convertBigIntToString(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, convertBigIntToString(value)])
    );
  } else if (typeof obj === 'bigint') {
    return obj.toString();
  }
  return obj;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const grantId = (await params).id;

  // 1. Check for existing GrantDetail
  let existingDetail = await prisma.grantDetail.findUnique({
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
  const webhookUrl = process.env.NEXT_PUBLIC_GRANT_DETAILS_WEBHOOK_URL;
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
  let webhookData;
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
    webhookData = JSON.parse(jsonMatch[1]);
  } catch (err) {
    return new Response('Error contacting or parsing webhook', { status: 502 });
  }

  // 5. Save new GrantDetail
  try {
    await prisma.grantDetail.create({
      data: {
        grantId: grantId,
        title: grant.title, // n8n does not return title
        purpose: webhookData.purpose || grant.purpose,
        description: typeof webhookData.description === 'string' ? webhookData.description : JSON.stringify(webhookData.description),
        eligibilityRequirements: webhookData.eligibilityRequirements || {},
        fundingDetails: webhookData.fundingDetails || {},
      },
    });
    // Refetch the grant with details
    const updatedGrant = await prisma.grant.findUnique({
      where: { id: grantId },
      include: { details: true },
    });
    return Response.json(convertBigIntToString(updatedGrant));
  } catch (err) {
    return new Response('Failed to save GrantDetail', { status: 500 });
  }
}
