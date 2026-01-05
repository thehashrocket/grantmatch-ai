const require_chunk = require('../../chunk-DWy1uDak.cjs');
const require_shared = require('../../shared-COdt67yK.cjs');
const __trpc_client_unstable_internals = require_chunk.__toESM(require("@trpc/client/unstable-internals"));
const __trpc_server_unstable_core_do_not_import = require_chunk.__toESM(require("@trpc/server/unstable-core-do-not-import"));
const __trpc_client = require_chunk.__toESM(require("@trpc/client"));
const __trpc_server_observable = require_chunk.__toESM(require("@trpc/server/observable"));
const next_cache = require_chunk.__toESM(require("next/cache"));

//#region src/app-dir/links/nextCache.ts
function experimental_nextCacheLink(opts) {
	const transformer = (0, __trpc_client_unstable_internals.getTransformer)(opts.transformer);
	return () => ({ op }) => (0, __trpc_server_observable.observable)((observer) => {
		var _ref;
		const { path, input, type, context } = op;
		const cacheTag = require_shared.generateCacheTag(path, input);
		const requestRevalidate = typeof context["revalidate"] === "number" || context["revalidate"] === false ? context["revalidate"] : void 0;
		const revalidate = (_ref = requestRevalidate !== null && requestRevalidate !== void 0 ? requestRevalidate : opts.revalidate) !== null && _ref !== void 0 ? _ref : false;
		const promise = opts.createContext().then(async (ctx) => {
			const callProc = async (_cachebuster) => {
				const procedureResult = await (0, __trpc_server_unstable_core_do_not_import.callProcedure)({
					router: opts.router,
					path,
					getRawInput: async () => input,
					ctx,
					type,
					signal: void 0
				});
				return transformer.input.serialize(procedureResult);
			};
			if (type === "query") return (0, next_cache.unstable_cache)(callProc, path.split("."), {
				revalidate,
				tags: [cacheTag]
			})(cacheTag);
			return callProc(cacheTag);
		}).catch((cause) => {
			observer.error(__trpc_client.TRPCClientError.from(cause));
		});
		promise.then((data) => {
			const transformedResult = transformer.output.deserialize(data);
			observer.next({ result: { data: transformedResult } });
			observer.complete();
		}).catch((cause) => {
			observer.error(__trpc_client.TRPCClientError.from(cause));
		});
	});
}

//#endregion
exports.experimental_nextCacheLink = experimental_nextCacheLink;