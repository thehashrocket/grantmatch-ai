import { __toESM, require_objectSpread2 } from "./objectSpread2-3tHFGdJc.mjs";
import { dehydrate } from "@tanstack/react-query";
import { getTransformer } from "@trpc/client/unstable-internals";
import { getQueryClient } from "@trpc/react-query/shared";
import { createElement } from "react";
import { createTRPCUntypedClient } from "@trpc/client";

//#region src/ssrPrepass.ts
var import_objectSpread2 = __toESM(require_objectSpread2(), 1);
function transformQueryOrMutationCacheErrors(result) {
	const error = result.state.error;
	if (error instanceof Error && error.name === "TRPCClientError") {
		const newError = {
			message: error.message,
			data: error.data,
			shape: error.shape
		};
		return (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, result), {}, { state: (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, result.state), {}, { error: newError }) });
	}
	return result;
}
const ssrPrepass = (opts) => {
	const { parent, WithTRPC, AppOrPage } = opts;
	const transformer = getTransformer(parent.transformer);
	WithTRPC.getInitialProps = async (appOrPageCtx) => {
		var _parent$responseMeta, _parent$responseMeta2, _meta$headers;
		const shouldSsr = async () => {
			if (typeof window !== "undefined") return false;
			if (typeof parent.ssr === "function") try {
				return await parent.ssr({ ctx: appOrPageCtx.ctx });
			} catch (_unused) {
				return false;
			}
			return parent.ssr;
		};
		const ssrEnabled = await shouldSsr();
		const AppTree = appOrPageCtx.AppTree;
		const isApp = !!appOrPageCtx.Component;
		const ctx = isApp ? appOrPageCtx.ctx : appOrPageCtx;
		let pageProps = {};
		if (AppOrPage.getInitialProps) {
			var _originalProps$pagePr;
			const originalProps = await AppOrPage.getInitialProps(appOrPageCtx);
			const originalPageProps = isApp ? (_originalProps$pagePr = originalProps.pageProps) !== null && _originalProps$pagePr !== void 0 ? _originalProps$pagePr : {} : originalProps;
			pageProps = (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, originalPageProps), pageProps);
		}
		const getAppTreeProps = (props) => isApp ? { pageProps: props } : props;
		if (typeof window !== "undefined" || !ssrEnabled) return getAppTreeProps(pageProps);
		const config = parent.config({ ctx });
		const trpcClient = createTRPCUntypedClient(config);
		const queryClient = getQueryClient(config);
		const trpcProp = {
			config,
			trpcClient,
			queryClient,
			ssrState: "prepass",
			ssrContext: ctx
		};
		const prepassProps = {
			pageProps,
			trpc: trpcProp
		};
		const reactDomServer = await import("react-dom/server");
		while (true) {
			reactDomServer.renderToString(createElement(AppTree, prepassProps));
			if (!queryClient.isFetching()) break;
			await new Promise((resolve) => {
				const unsub = queryClient.getQueryCache().subscribe((event) => {
					if ((event === null || event === void 0 ? void 0 : event.query.getObserversCount()) === 0) {
						resolve();
						unsub();
					}
				});
			});
		}
		const dehydratedCache = dehydrate(queryClient, { shouldDehydrateQuery(query) {
			const isExcludedFromSSr = query.state.fetchStatus === "idle" && query.state.status === "pending";
			return !isExcludedFromSSr;
		} });
		const dehydratedCacheWithErrors = (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, dehydratedCache), {}, {
			queries: dehydratedCache.queries.map(transformQueryOrMutationCacheErrors),
			mutations: dehydratedCache.mutations.map(transformQueryOrMutationCacheErrors)
		});
		pageProps["trpcState"] = transformer.input.serialize(dehydratedCacheWithErrors);
		const appTreeProps = getAppTreeProps(pageProps);
		const meta = (_parent$responseMeta = (_parent$responseMeta2 = parent.responseMeta) === null || _parent$responseMeta2 === void 0 ? void 0 : _parent$responseMeta2.call(parent, {
			ctx,
			clientErrors: [...dehydratedCache.queries, ...dehydratedCache.mutations].map((v) => v.state.error).flatMap((err) => err instanceof Error && err.name === "TRPCClientError" ? [err] : [])
		})) !== null && _parent$responseMeta !== void 0 ? _parent$responseMeta : {};
		for (const [key, value] of Object.entries((_meta$headers = meta.headers) !== null && _meta$headers !== void 0 ? _meta$headers : {})) if (typeof value === "string") {
			var _ctx$res;
			(_ctx$res = ctx.res) === null || _ctx$res === void 0 || _ctx$res.setHeader(key, value);
		}
		if (meta.status && ctx.res) ctx.res.statusCode = meta.status;
		return appTreeProps;
	};
};

//#endregion
export { ssrPrepass };
//# sourceMappingURL=ssrPrepass.mjs.map