import { db } from '@/lib/db';
import { z } from "zod";

const bodySchema = z.object({
  dateStart: z.string(), // YYYY-MM-DD
  dateEnd: z.string(),
  requestedByUserId: z.string(),
});

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
      console.log('body', body);
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Invalid or missing JSON body.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let parsed;
    try {
      parsed = bodySchema.parse(body);
      console.log('parsed', parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: 'Validation failed', details: err.errors }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw err;
    }

    const { dateStart, dateEnd, requestedByUserId } = parsed;

    // 1. create run
    const run = await db.grantImportRun.create({
      data: {
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        requestedByUserId,
      },
    });

    // 2. kick n8n
    await fetch(process.env.NEXT_PUBLIC_N8N_GRANT_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId: run.id, dateStart, dateEnd }),
    });
    console.log('n8n url', process.env.NEXT_PUBLIC_N8N_GRANT_WEBHOOK_URL);
    console.log('n8n kicked');

    return new Response(JSON.stringify({ runId: run.id }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error in /api/gp/start:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
