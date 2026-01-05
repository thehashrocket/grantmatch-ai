const require_chunk = require('../../chunk-DWy1uDak.cjs');
const require_objectSpread2$1 = require('../../objectSpread2-CGXFkI72.cjs');
const require_shared = require('../../shared-COdt67yK.cjs');
const __trpc_client = require_chunk.__toESM(require("@trpc/client"));

//#region src/app-dir/links/nextHttp.ts
var import_objectSpread2 = require_chunk.__toESM(require_objectSpread2$1.require_objectSpread2(), 1);
function experimental_nextHttpLink(opts) {
	return (runtime) => {
		return (ctx) => {
			var _ref;
			const { path, input, context } = ctx.op;
			const cacheTag = require_shared.generateCacheTag(path, input);
			const requestRevalidate = typeof context["revalidate"] === "number" || context["revalidate"] === false ? context["revalidate"] : void 0;
			const revalidate = (_ref = requestRevalidate !== null && requestRevalidate !== void 0 ? requestRevalidate : opts.revalidate) !== null && _ref !== void 0 ? _ref : false;
			const _fetch = (url, fetchOpts) => {
				return fetch(url, (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, fetchOpts), {}, { next: {
					revalidate,
					tags: [cacheTag]
				} }));
			};
			const link = opts.batch ? (0, __trpc_client.httpBatchLink)((0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, opts), {}, { fetch: _fetch })) : (0, __trpc_client.httpLink)((0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, opts), {}, { fetch: _fetch }));
			return link(runtime)(ctx);
		};
	};
}

//#endregion
exports.experimental_nextHttpLink = experimental_nextHttpLink;