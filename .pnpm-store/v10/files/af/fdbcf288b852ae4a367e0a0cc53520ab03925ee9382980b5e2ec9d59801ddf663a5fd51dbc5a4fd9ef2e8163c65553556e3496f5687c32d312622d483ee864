const require_chunk = require('./chunk-DWy1uDak.cjs');
const __trpc_server_unstable_core_do_not_import = require_chunk.__toESM(require("@trpc/server/unstable-core-do-not-import"));
const __trpc_client = require_chunk.__toESM(require("@trpc/client"));

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
Object.defineProperty(exports, 'generateCacheTag', {
  enumerable: true,
  get: function () {
    return generateCacheTag;
  }
});
Object.defineProperty(exports, 'isFormData', {
  enumerable: true,
  get: function () {
    return isFormData;
  }
});