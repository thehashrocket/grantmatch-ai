import { __toESM, require_objectSpread2 } from "./objectSpread2-3tHFGdJc.mjs";
import { HydrationBoundary, QueryClientProvider } from "@tanstack/react-query";
import { getTransformer } from "@trpc/client/unstable-internals";
import { createReactDecoration, createReactQueryUtils, createRootHooks, getQueryClient } from "@trpc/react-query/shared";
import React, { useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { createFlatProxy } from "@trpc/server/unstable-core-do-not-import";

//#region src/withTRPC.tsx
var import_objectSpread2 = __toESM(require_objectSpread2());
function withTRPC(opts) {
	const { config: getClientConfig } = opts;
	const transformer = getTransformer(opts.transformer);
	return (AppOrPage) => {
		var _ref, _AppOrPage$displayNam;
		const trpc = createRootHooks(opts);
		const WithTRPC = (props) => {
			var _props$pageProps, _abortOnUnmount;
			const [prepassProps] = useState(() => {
				if (props.trpc) return props.trpc;
				const config = getClientConfig({});
				const queryClient$1 = getQueryClient(config);
				const trpcClient$1 = trpc.createClient(config);
				return {
					abortOnUnmount: config.abortOnUnmount,
					queryClient: queryClient$1,
					trpcClient: trpcClient$1,
					ssrState: opts.ssr ? "mounting" : false,
					ssrContext: null
				};
			});
			const { queryClient, trpcClient, ssrState, ssrContext } = prepassProps;
			const trpcState = (_props$pageProps = props.pageProps) === null || _props$pageProps === void 0 ? void 0 : _props$pageProps.trpcState;
			const hydratedState = React.useMemo(() => {
				if (!trpcState) return trpcState;
				return transformer.input.deserialize(trpcState);
			}, [trpcState]);
			return /* @__PURE__ */ jsx(trpc.Provider, {
				abortOnUnmount: (_abortOnUnmount = prepassProps.abortOnUnmount) !== null && _abortOnUnmount !== void 0 ? _abortOnUnmount : false,
				client: trpcClient,
				queryClient,
				ssrState,
				ssrContext,
				children: /* @__PURE__ */ jsx(QueryClientProvider, {
					client: queryClient,
					children: /* @__PURE__ */ jsx(HydrationBoundary, {
						state: hydratedState,
						children: /* @__PURE__ */ jsx(AppOrPage, (0, import_objectSpread2.default)({}, props))
					})
				})
			});
		};
		if (opts.ssr) opts.ssrPrepass({
			parent: opts,
			AppOrPage,
			WithTRPC
		});
		else if (AppOrPage.getInitialProps) WithTRPC.getInitialProps = async (appOrPageCtx) => {
			var _originalProps$pagePr;
			const isApp = !!appOrPageCtx.Component;
			let pageProps = {};
			const originalProps = await AppOrPage.getInitialProps(appOrPageCtx);
			const originalPageProps = isApp ? (_originalProps$pagePr = originalProps.pageProps) !== null && _originalProps$pagePr !== void 0 ? _originalProps$pagePr : {} : originalProps;
			pageProps = (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, originalPageProps), pageProps);
			const getAppTreeProps = (props) => isApp ? { pageProps: props } : props;
			return getAppTreeProps(pageProps);
		};
		const displayName = (_ref = (_AppOrPage$displayNam = AppOrPage.displayName) !== null && _AppOrPage$displayNam !== void 0 ? _AppOrPage$displayNam : AppOrPage.name) !== null && _ref !== void 0 ? _ref : "Component";
		WithTRPC.displayName = `withTRPC(${displayName})`;
		return WithTRPC;
	};
}

//#endregion
//#region src/createTRPCNext.tsx
function createTRPCNext(opts) {
	const hooks = createRootHooks(opts);
	const _withTRPC = withTRPC(opts);
	const proxy = createReactDecoration(hooks);
	return createFlatProxy((key) => {
		if (key === "useContext" || key === "useUtils") return () => {
			const context = hooks.useUtils();
			return useMemo(() => {
				return createReactQueryUtils(context);
			}, [context]);
		};
		if (key === "useQueries") return hooks.useQueries;
		if (key === "useSuspenseQueries") return hooks.useSuspenseQueries;
		if (key === "withTRPC") return _withTRPC;
		return proxy[key];
	});
}

//#endregion
export { createTRPCNext, withTRPC };
//# sourceMappingURL=index.mjs.map