import { generateCacheTag } from "../../shared-Bco66qhk.mjs";
import { getTransformer } from "@trpc/client/unstable-internals";
import { callProcedure } from "@trpc/server/unstable-core-do-not-import";
import { TRPCClientError } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { unstable_cache } from "next/cache";

//#region src/app-dir/links/nextCache.ts
function experimental_nextCacheLink(opts) {
	const transformer = getTransformer(opts.transformer);
	return () => ({ op }) => observable((observer) => {
		var _ref;
		const { path, input, type, context } = op;
		const cacheTag = generateCacheTag(path, input);
		const requestRevalidate = typeof context["revalidate"] === "number" || context["revalidate"] === false ? context["revalidate"] : void 0;
		const revalidate = (_ref = requestRevalidate !== null && requestRevalidate !== void 0 ? requestRevalidate : opts.revalidate) !== null && _ref !== void 0 ? _ref : false;
		const promise = opts.createContext().then(async (ctx) => {
			const callProc = async (_cachebuster) => {
				const procedureResult = await callProcedure({
					router: opts.router,
					path,
					getRawInput: async () => input,
					ctx,
					type,
					signal: void 0
				});
				return transformer.input.serialize(procedureResult);
			};
			if (type === "query") return unstable_cache(callProc, path.split("."), {
				revalidate,
				tags: [cacheTag]
			})(cacheTag);
			return callProc(cacheTag);
		}).catch((cause) => {
			observer.error(TRPCClientError.from(cause));
		});
		promise.then((data) => {
			const transformedResult = transformer.output.deserialize(data);
			observer.next({ result: { data: transformedResult } });
			observer.complete();
		}).catch((cause) => {
			observer.error(TRPCClientError.from(cause));
		});
	});
}

//#endregion
export { experimental_nextCacheLink };
//# sourceMappingURL=nextCache.mjs.map