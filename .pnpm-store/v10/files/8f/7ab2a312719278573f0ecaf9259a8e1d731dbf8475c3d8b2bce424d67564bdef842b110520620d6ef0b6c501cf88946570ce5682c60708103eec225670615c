import { generateCacheTag, isFormData } from "../shared-Bco66qhk.mjs";
import { cache } from "react";
import { TRPCError, createRecursiveProxy, formDataToObject, getErrorShape, getTRPCErrorFromUnknown, transformTRPCResponse } from "@trpc/server/unstable-core-do-not-import";
import { clientCallTypeToProcedureType, createTRPCUntypedClient } from "@trpc/client";
import { rethrowNextErrors } from "@trpc/server/adapters/next-app-dir";
import { revalidateTag } from "next/cache";

//#region src/app-dir/server.ts
function experimental_createTRPCNextAppDirServer(opts) {
	const getClient = cache(() => {
		const config = opts.config();
		return createTRPCUntypedClient(config);
	});
	return createRecursiveProxy((callOpts) => {
		const client = getClient();
		const pathCopy = [...callOpts.path];
		const action = pathCopy.pop();
		const procedurePath = pathCopy.join(".");
		const procedureType = clientCallTypeToProcedureType(action);
		const cacheTag = generateCacheTag(procedurePath, callOpts.args[0]);
		if (action === "revalidate") {
			revalidateTag(cacheTag);
			return;
		}
		return client[procedureType](procedurePath, ...callOpts.args);
	});
}
function experimental_createServerActionHandler(t, opts) {
	const config = t._config;
	const { normalizeFormData = true, createContext, rethrowNextErrors: shouldRethrowNextErrors = true } = opts;
	const transformer = config.transformer;
	return function createServerAction(proc) {
		return async function actionHandler(rawInput) {
			let ctx = void 0;
			try {
				var _await$createContext;
				ctx = (_await$createContext = await (createContext === null || createContext === void 0 ? void 0 : createContext())) !== null && _await$createContext !== void 0 ? _await$createContext : {};
				if (normalizeFormData && isFormData(rawInput)) try {
					rawInput = formDataToObject(rawInput);
				} catch (_unused) {
					throw new TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to convert FormData to an object"
					});
				}
				else if (rawInput && !isFormData(rawInput)) rawInput = transformer.input.deserialize(rawInput);
				const data = proc._def.experimental_caller ? await proc(rawInput) : await proc({
					input: void 0,
					ctx,
					path: "",
					getRawInput: async () => rawInput,
					type: proc._def.type,
					signal: void 0
				});
				const transformedJSON = transformTRPCResponse(config, { result: { data } });
				return transformedJSON;
			} catch (cause) {
				var _opts$onError;
				const error = getTRPCErrorFromUnknown(cause);
				(_opts$onError = opts.onError) === null || _opts$onError === void 0 || _opts$onError.call(opts, {
					ctx,
					error,
					input: rawInput,
					path: "",
					type: proc._def.type
				});
				if (shouldRethrowNextErrors) rethrowNextErrors(error);
				const shape = getErrorShape({
					config,
					ctx,
					error,
					input: rawInput,
					path: "",
					type: proc._def.type
				});
				return transformTRPCResponse(t._config, { error: shape });
			}
		};
	};
}
async function experimental_revalidateEndpoint(req) {
	const { cacheTag } = await req.json();
	if (typeof cacheTag !== "string") return new Response(JSON.stringify({
		revalidated: false,
		error: "cacheTag must be a string"
	}), { status: 400 });
	revalidateTag(cacheTag);
	return new Response(JSON.stringify({
		revalidated: true,
		now: Date.now()
	}), { status: 200 });
}

//#endregion
export { experimental_createServerActionHandler, experimental_createTRPCNextAppDirServer, experimental_revalidateEndpoint };
//# sourceMappingURL=server.mjs.map