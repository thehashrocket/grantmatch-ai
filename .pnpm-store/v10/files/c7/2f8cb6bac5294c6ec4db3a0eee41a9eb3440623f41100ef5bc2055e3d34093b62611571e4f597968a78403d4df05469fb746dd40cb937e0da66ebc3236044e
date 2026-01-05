const require_chunk = require('./chunk-DWy1uDak.cjs');
const require_objectSpread2$1 = require('./objectSpread2-CGXFkI72.cjs');
const __tanstack_react_query = require_chunk.__toESM(require("@tanstack/react-query"));
const __trpc_client_unstable_internals = require_chunk.__toESM(require("@trpc/client/unstable-internals"));
const __trpc_react_query_shared = require_chunk.__toESM(require("@trpc/react-query/shared"));
const react = require_chunk.__toESM(require("react"));
const react_jsx_runtime = require_chunk.__toESM(require("react/jsx-runtime"));
const __trpc_server_unstable_core_do_not_import = require_chunk.__toESM(require("@trpc/server/unstable-core-do-not-import"));

//#region src/withTRPC.tsx
var import_objectSpread2 = require_chunk.__toESM(require_objectSpread2$1.require_objectSpread2());
function withTRPC(opts) {
	const { config: getClientConfig } = opts;
	const transformer = (0, __trpc_client_unstable_internals.getTransformer)(opts.transformer);
	return (AppOrPage) => {
		var _ref, _AppOrPage$displayNam;
		const trpc = (0, __trpc_react_query_shared.createRootHooks)(opts);
		const WithTRPC = (props) => {
			var _props$pageProps, _abortOnUnmount;
			const [prepassProps] = (0, react.useState)(() => {
				if (props.trpc) return props.trpc;
				const config = getClientConfig({});
				const queryClient$1 = (0, __trpc_react_query_shared.getQueryClient)(config);
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
			const hydratedState = react.default.useMemo(() => {
				if (!trpcState) return trpcState;
				return transformer.input.deserialize(trpcState);
			}, [trpcState]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(trpc.Provider, {
				abortOnUnmount: (_abortOnUnmount = prepassProps.abortOnUnmount) !== null && _abortOnUnmount !== void 0 ? _abortOnUnmount : false,
				client: trpcClient,
				queryClient,
				ssrState,
				ssrContext,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__tanstack_react_query.QueryClientProvider, {
					client: queryClient,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(__tanstack_react_query.HydrationBoundary, {
						state: hydratedState,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AppOrPage, (0, import_objectSpread2.default)({}, props))
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
	const hooks = (0, __trpc_react_query_shared.createRootHooks)(opts);
	const _withTRPC = withTRPC(opts);
	const proxy = (0, __trpc_react_query_shared.createReactDecoration)(hooks);
	return (0, __trpc_server_unstable_core_do_not_import.createFlatProxy)((key) => {
		if (key === "useContext" || key === "useUtils") return () => {
			const context = hooks.useUtils();
			return (0, react.useMemo)(() => {
				return (0, __trpc_react_query_shared.createReactQueryUtils)(context);
			}, [context]);
		};
		if (key === "useQueries") return hooks.useQueries;
		if (key === "useSuspenseQueries") return hooks.useSuspenseQueries;
		if (key === "withTRPC") return _withTRPC;
		return proxy[key];
	});
}

//#endregion
exports.createTRPCNext = createTRPCNext;
exports.withTRPC = withTRPC;