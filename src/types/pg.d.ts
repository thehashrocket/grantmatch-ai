declare module 'pg' {
	export class Pool {
		constructor(config?: Record<string, unknown>);
		connect: (...args: unknown[]) => unknown;
		query: (...args: unknown[]) => unknown;
		end: () => Promise<void> | void;
	}
}
