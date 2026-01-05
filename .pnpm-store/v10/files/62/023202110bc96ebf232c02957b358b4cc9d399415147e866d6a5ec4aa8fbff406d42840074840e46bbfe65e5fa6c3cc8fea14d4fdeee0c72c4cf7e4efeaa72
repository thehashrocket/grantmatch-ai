const require_chunk = require('../chunk-DWy1uDak.cjs');
const require_objectSpread2$1 = require('../objectSpread2-CGXFkI72.cjs');
const require_shared = require('../shared-COdt67yK.cjs');
const __trpc_client_unstable_internals = require_chunk.__toESM(require("@trpc/client/unstable-internals"));
const react = require_chunk.__toESM(require("react"));
const __trpc_server_unstable_core_do_not_import = require_chunk.__toESM(require("@trpc/server/unstable-core-do-not-import"));
const __trpc_client = require_chunk.__toESM(require("@trpc/client"));
const __trpc_server_observable = require_chunk.__toESM(require("@trpc/server/observable"));

//#region src/app-dir/create-action-hook.tsx
var import_objectSpread2 = require_chunk.__toESM(require_objectSpread2$1.require_objectSpread2());
function experimental_serverActionLink(...args) {
	const [opts] = args;
	const transformer = (0, __trpc_client_unstable_internals.getTransformer)(opts === null || opts === void 0 ? void 0 : opts.transformer);
	return () => ({ op }) => (0, __trpc_server_observable.observable)((observer) => {
		const context = op.context;
		context._action(require_shared.isFormData(op.input) ? op.input : transformer.input.serialize(op.input)).then((data) => {
			const transformed = (0, __trpc_server_unstable_core_do_not_import.transformResult)(data, transformer.output);
			if (!transformed.ok) {
				observer.error(__trpc_client.TRPCClientError.from(transformed.error, {}));
				return;
			}
			observer.next({
				context: op.context,
				result: transformed.result
			});
			observer.complete();
		}).catch((cause) => {
			observer.error(__trpc_client.TRPCClientError.from(cause));
		});
	});
}
function experimental_createActionHook(opts) {
	const client = (0, __trpc_client.createTRPCUntypedClient)(opts);
	return function useAction(handler, useActionOpts) {
		const count = (0, react.useRef)(0);
		const [state, setState] = (0, react.useState)({ status: "idle" });
		const actionOptsRef = (0, react.useRef)(useActionOpts);
		actionOptsRef.current = useActionOpts;
		(0, react.useEffect)(() => {
			return () => {
				count.current = -1;
				actionOptsRef.current = void 0;
			};
		}, []);
		const mutateAsync = (0, react.useCallback)((input, requestOptions) => {
			const idx = ++count.current;
			const context = (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.context), {}, { _action(innerInput) {
				return handler(innerInput);
			} });
			setState({ status: "loading" });
			return client.mutation("serverAction", input, (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, requestOptions), {}, { context })).then(async (data) => {
				var _actionOptsRef$curren, _actionOptsRef$curren2;
				await ((_actionOptsRef$curren = actionOptsRef.current) === null || _actionOptsRef$curren === void 0 || (_actionOptsRef$curren2 = _actionOptsRef$curren.onSuccess) === null || _actionOptsRef$curren2 === void 0 ? void 0 : _actionOptsRef$curren2.call(_actionOptsRef$curren, data));
				if (idx !== count.current) return;
				setState({
					status: "success",
					data
				});
			}).catch(async (error) => {
				var _actionOptsRef$curren3, _actionOptsRef$curren4;
				await ((_actionOptsRef$curren3 = actionOptsRef.current) === null || _actionOptsRef$curren3 === void 0 || (_actionOptsRef$curren4 = _actionOptsRef$curren3.onError) === null || _actionOptsRef$curren4 === void 0 ? void 0 : _actionOptsRef$curren4.call(_actionOptsRef$curren3, error));
				throw error;
			}).catch((error) => {
				if (idx !== count.current) return;
				setState({
					status: "error",
					error: __trpc_client.TRPCClientError.from(error, {})
				});
				throw error;
			});
		}, [handler]);
		const mutate = (0, react.useCallback)((...args) => {
			mutateAsync(...args).catch(() => {});
		}, [mutateAsync]);
		return (0, react.useMemo)(() => (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, state), {}, {
			mutate,
			mutateAsync
		}), [
			mutate,
			mutateAsync,
			state
		]);
	};
}

//#endregion
//#region src/app-dir/client.ts
function experimental_createTRPCNextAppDirClient(opts) {
	const client = (0, __trpc_client.createTRPCUntypedClient)(opts.config());
	const cache = /* @__PURE__ */ new Map();
	return (0, __trpc_server_unstable_core_do_not_import.createRecursiveProxy)(({ path, args }) => {
		const pathCopy = [...path];
		const procedureType = (0, __trpc_client.clientCallTypeToProcedureType)(pathCopy.pop());
		if (procedureType === "query") {
			const queryCacheKey$1 = JSON.stringify([path, args[0]]);
			const cached = cache.get(queryCacheKey$1);
			if (cached === null || cached === void 0 ? void 0 : cached.promise) return cached.promise;
		}
		const fullPath = pathCopy.join(".");
		const promise = client[procedureType](fullPath, ...args);
		if (procedureType !== "query") return promise;
		const queryCacheKey = JSON.stringify([path, args[0]]);
		cache.set(queryCacheKey, { promise });
		return promise;
	});
}

//#endregion
exports.experimental_createActionHook = experimental_createActionHook;
exports.experimental_createTRPCNextAppDirClient = experimental_createTRPCNextAppDirClient;
exports.experimental_serverActionLink = experimental_serverActionLink;