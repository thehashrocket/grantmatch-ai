import { __toESM, require_objectSpread2 } from "../objectSpread2-3tHFGdJc.mjs";
import { isFormData } from "../shared-Bco66qhk.mjs";
import { getTransformer } from "@trpc/client/unstable-internals";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRecursiveProxy, transformResult } from "@trpc/server/unstable-core-do-not-import";
import { TRPCClientError, clientCallTypeToProcedureType, createTRPCUntypedClient } from "@trpc/client";
import { observable } from "@trpc/server/observable";

//#region src/app-dir/create-action-hook.tsx
var import_objectSpread2 = __toESM(require_objectSpread2());
function experimental_serverActionLink(...args) {
	const [opts] = args;
	const transformer = getTransformer(opts === null || opts === void 0 ? void 0 : opts.transformer);
	return () => ({ op }) => observable((observer) => {
		const context = op.context;
		context._action(isFormData(op.input) ? op.input : transformer.input.serialize(op.input)).then((data) => {
			const transformed = transformResult(data, transformer.output);
			if (!transformed.ok) {
				observer.error(TRPCClientError.from(transformed.error, {}));
				return;
			}
			observer.next({
				context: op.context,
				result: transformed.result
			});
			observer.complete();
		}).catch((cause) => {
			observer.error(TRPCClientError.from(cause));
		});
	});
}
function experimental_createActionHook(opts) {
	const client = createTRPCUntypedClient(opts);
	return function useAction(handler, useActionOpts) {
		const count = useRef(0);
		const [state, setState] = useState({ status: "idle" });
		const actionOptsRef = useRef(useActionOpts);
		actionOptsRef.current = useActionOpts;
		useEffect(() => {
			return () => {
				count.current = -1;
				actionOptsRef.current = void 0;
			};
		}, []);
		const mutateAsync = useCallback((input, requestOptions) => {
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
					error: TRPCClientError.from(error, {})
				});
				throw error;
			});
		}, [handler]);
		const mutate = useCallback((...args) => {
			mutateAsync(...args).catch(() => {});
		}, [mutateAsync]);
		return useMemo(() => (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, state), {}, {
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
	const client = createTRPCUntypedClient(opts.config());
	const cache$1 = /* @__PURE__ */ new Map();
	return createRecursiveProxy(({ path, args }) => {
		const pathCopy = [...path];
		const procedureType = clientCallTypeToProcedureType(pathCopy.pop());
		if (procedureType === "query") {
			const queryCacheKey$1 = JSON.stringify([path, args[0]]);
			const cached = cache$1.get(queryCacheKey$1);
			if (cached === null || cached === void 0 ? void 0 : cached.promise) return cached.promise;
		}
		const fullPath = pathCopy.join(".");
		const promise = client[procedureType](fullPath, ...args);
		if (procedureType !== "query") return promise;
		const queryCacheKey = JSON.stringify([path, args[0]]);
		cache$1.set(queryCacheKey, { promise });
		return promise;
	});
}

//#endregion
export { experimental_createActionHook, experimental_createTRPCNextAppDirClient, experimental_serverActionLink };
//# sourceMappingURL=client.mjs.map