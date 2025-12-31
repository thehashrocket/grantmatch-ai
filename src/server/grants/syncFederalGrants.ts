import { runIngest } from '@/server/grants/ingest/runIngest';
import { federalGrantsGovAdapter } from '@/server/grants/sources/federalGrantsGovAdapter';

export function syncFederalGrants(options?: { fireAndForget?: boolean }) {
	return runIngest(federalGrantsGovAdapter, options);
}
