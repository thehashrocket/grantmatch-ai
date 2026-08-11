import { db } from '@/lib/db';
import { z } from 'zod';

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
		} catch {
			return new Response(
				JSON.stringify({ error: 'Invalid or missing JSON body.' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		let parsed: z.infer<typeof bodySchema>;
		try {
			parsed = bodySchema.parse(body);
			console.log('parsed', parsed);
		} catch (err) {
			if (err instanceof z.ZodError) {
				return new Response(
					JSON.stringify({ error: 'Validation failed', details: err.issues }),
					{
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					},
				);
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
		const webhookUrl = process.env.N8N_GRANT_WEBHOOK_URL;
		if (!webhookUrl) {
			return new Response(
				JSON.stringify({ error: 'N8N webhook URL not configured' }),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				},
			);
		}

		console.log('Attempting to call webhook:', webhookUrl);

		try {
			const response = await fetch(webhookUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ runId: run.id, dateStart, dateEnd }),
			});

			if (!response.ok) {
				console.error(
					'Webhook call failed with status:',
					response.status,
					response.statusText,
				);
				// Continue execution - don't fail the API call if webhook fails
			} else {
				console.log('Webhook called successfully');
			}
		} catch (webhookError) {
			console.error('Failed to call webhook:', webhookError);
			// Don't fail the entire API call if the webhook fails
			// Log the error but continue with the response
		}

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
