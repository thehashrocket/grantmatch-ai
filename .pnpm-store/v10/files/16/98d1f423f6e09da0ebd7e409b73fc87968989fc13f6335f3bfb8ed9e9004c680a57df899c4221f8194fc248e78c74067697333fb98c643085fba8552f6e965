import { AnyRootTypes, AnyRouter } from "@trpc/server/unstable-core-do-not-import";
import { HTTPBatchLinkOptions, HTTPLinkOptions, TRPCLink } from "@trpc/client";

//#region src/app-dir/links/nextHttp.d.ts
interface NextLinkBaseOptions {
  revalidate?: number | false;
  batch?: boolean;
}
type NextLinkSingleOptions<TRoot extends AnyRootTypes> = NextLinkBaseOptions & Omit<HTTPLinkOptions<TRoot>, 'fetch'> & {
  batch?: false;
};
type NextLinkBatchOptions<TRoot extends AnyRootTypes> = NextLinkBaseOptions & Omit<HTTPBatchLinkOptions<TRoot>, 'fetch'> & {
  batch: true;
};
declare function experimental_nextHttpLink<TRouter extends AnyRouter>(opts: NextLinkSingleOptions<TRouter['_def']['_config']['$types']> | NextLinkBatchOptions<TRouter['_def']['_config']['$types']>): TRPCLink<TRouter>;
//#endregion
export { experimental_nextHttpLink };
//# sourceMappingURL=nextHttp.d.mts.map