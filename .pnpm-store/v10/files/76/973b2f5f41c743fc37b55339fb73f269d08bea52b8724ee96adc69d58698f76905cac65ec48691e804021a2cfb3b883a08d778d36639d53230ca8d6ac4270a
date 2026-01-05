const require_chunk = require('../chunk-DWy1uDak.cjs');
const require_shared = require('../shared-COdt67yK.cjs');
const react = require_chunk.__toESM(require("react"));
const __trpc_server_unstable_core_do_not_import = require_chunk.__toESM(require("@trpc/server/unstable-core-do-not-import"));
const __trpc_client = require_chunk.__toESM(require("@trpc/client"));
const __trpc_server_adapters_next_app_dir = require_chunk.__toESM(require("@trpc/server/adapters/next-app-dir"));
const next_cache = require_chunk.__toESM(require("next/cache"));

//#region src/app-dir/server.ts
function experimental_createTRPCNextAppDirServer(opts) {
	const getClient = (0, react.cache)(() => {
		const config = opts.config();
		return (0, __trpc_client.createTRPCUntypedClient)(config);
	});
	return (0, __trpc_server_unstable_core_do_not_import.createRecursiveProxy)((callOpts) => {
		const client = getClient();
		const pathCopy = [...callOpts.path];
		const action = pathCopy.pop();
		const procedurePath = pathCopy.join(".");
		const procedureType = (0, __trpc_client.clientCallTypeToProcedureType)(action);
		const cacheTag = require_shared.generateCacheTag(procedurePath, callOpts.args[0]);
		if (action === "revalidate") {
			(0, next_cache.revalidateTag)(cacheTag);
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
				if (normalizeFormData && require_shared.isFormData(rawInput)) try {
					rawInput = (0, __trpc_server_unstable_core_do_not_import.formDataToObject)(rawInput);
				} catch (_unused) {
					throw new __trpc_server_unstable_core_do_not_import.TRPCError({
						code: "INTERNAL_SERVER_ERROR",
						message: "Failed to convert FormData to an object"
					});
				}
				else if (rawInput && !require_shared.isFormData(rawInput)) rawInput = transformer.input.deserialize(rawInput);
				const data = proc._def.experimental_caller ? await proc(rawInput) : await proc({
					input: void 0,
					ctx,
					path: "",
					getRawInput: async () => rawInput,
					type: proc._def.type,
					signal: void 0
				});
				const transformedJSON = (0, __trpc_server_unstable_core_do_not_import.transformTRPCResponse)(config, { result: { data } });
				return transformedJSON;
			} catch (cause) {
				var _opts$onError;
				const error = (0, __trpc_server_unstable_core_do_not_import.getTRPCErrorFromUnknown)(cause);
				(_opts$onError = opts.onError) === null || _opts$onError === void 0 || _opts$onError.call(opts, {
					ctx,
					error,
					input: rawInput,
					path: "",
					type: proc._def.type
				});
				if (shouldRethrowNextErrors) (0, __trpc_server_adapters_next_app_dir.rethrowNextErrors)(error);
				const shape = (0, __trpc_server_unstable_core_do_not_import.getErrorShape)({
					config,
					ctx,
					error,
					input: rawInput,
					path: "",
					type: proc._def.type
				});
				return (0, __trpc_server_unstable_core_do_not_import.transformTRPCResponse)(t._config, { error: shape });
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
	(0, next_cache.revalidateTag)(cacheTag);
	return new Response(JSON.stringify({
		revalidated: true,
		now: Date.now()
	}), { status: 200 });
}

//#endregion
exports.experimental_createServerActionHandler = experimental_createServerActionHandler;
exports.experimental_createTRPCNextAppDirServer = experimental_createTRPCNextAppDirServer;
exports.experimental_revalidateEndpoint = experimental_revalidateEndpoint;