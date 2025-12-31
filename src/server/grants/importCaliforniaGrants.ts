import { runIngest } from '@/server/grants/ingest/runIngest';
import { caCsvAdapter } from '@/server/grants/sources/caCsvAdapter';

export function importCaliforniaGrants(options?: { fireAndForget?: boolean }) {
	return runIngest(caCsvAdapter, options);
}
