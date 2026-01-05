import { createRecursiveProxy } from "@trpc/server/unstable-core-do-not-import";
import { TRPCUntypedClient } from "@trpc/client";

//#region src/app-dir/shared.ts
/**
* @internal
*/
function generateCacheTag(procedurePath, input) {
	return input ? `${procedurePath}?input=${JSON.stringify(input)}` : procedurePath;
}
function isFormData(value) {
	if (typeof FormData === "undefined") return false;
	return value instanceof FormData;
}

//#endregion
export { generateCacheTag, isFormData };
//# sourceMappingURL=shared-Bco66qhk.mjs.map