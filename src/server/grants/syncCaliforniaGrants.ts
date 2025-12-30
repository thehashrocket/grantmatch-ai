import { runIngest } from '@/server/grants/ingest/runIngest';
import { caCkanAdapter } from '@/server/grants/sources/caCkanAdapter';

export function syncCaliforniaGrants() {
  return runIngest(caCkanAdapter);
}
