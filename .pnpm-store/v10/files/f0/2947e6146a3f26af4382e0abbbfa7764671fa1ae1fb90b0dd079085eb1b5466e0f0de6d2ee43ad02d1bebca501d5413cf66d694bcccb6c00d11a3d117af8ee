import { __toESM, require_objectSpread2 } from "../../objectSpread2-3tHFGdJc.mjs";
import { generateCacheTag } from "../../shared-Bco66qhk.mjs";
import { httpBatchLink, httpLink } from "@trpc/client";

//#region src/app-dir/links/nextHttp.ts
var import_objectSpread2 = __toESM(require_objectSpread2(), 1);
function experimental_nextHttpLink(opts) {
	return (runtime) => {
		return (ctx) => {
			var _ref;
			const { path, input, context } = ctx.op;
			const cacheTag = generateCacheTag(path, input);
			const requestRevalidate = typeof context["revalidate"] === "number" || context["revalidate"] === false ? context["revalidate"] : void 0;
			const revalidate = (_ref = requestRevalidate !== null && requestRevalidate !== void 0 ? requestRevalidate : opts.revalidate) !== null && _ref !== void 0 ? _ref : false;
			const _fetch = (url, fetchOpts) => {
				return fetch(url, (0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, fetchOpts), {}, { next: {
					revalidate,
					tags: [cacheTag]
				} }));
			};
			const link = opts.batch ? httpBatchLink((0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, opts), {}, { fetch: _fetch })) : httpLink((0, import_objectSpread2.default)((0, import_objectSpread2.default)({}, opts), {}, { fetch: _fetch }));
			return link(runtime)(ctx);
		};
	};
}

//#endregion
export { experimental_nextHttpLink };
//# sourceMappingURL=nextHttp.mjs.map