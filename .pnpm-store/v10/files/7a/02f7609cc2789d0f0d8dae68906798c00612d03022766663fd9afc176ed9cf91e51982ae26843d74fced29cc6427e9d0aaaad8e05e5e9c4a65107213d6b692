import { TransformerOptions } from "@trpc/client/unstable-internals";
import { AnyRouter, inferClientTypes, inferRouterContext } from "@trpc/server/unstable-core-do-not-import";
import { TRPCLink } from "@trpc/client";

//#region src/app-dir/links/nextCache.d.ts
type NextCacheLinkOptions<TRouter extends AnyRouter> = {
  router: TRouter;
  createContext: () => Promise<inferRouterContext<TRouter>>;
  /** how many seconds the cache should hold before revalidating */
  revalidate?: number | false;
} & TransformerOptions<inferClientTypes<TRouter>>;
declare function experimental_nextCacheLink<TRouter extends AnyRouter>(opts: NextCacheLinkOptions<TRouter>): TRPCLink<TRouter>;
//#endregion
export { experimental_nextCacheLink };
//# sourceMappingURL=nextCache.d.mts.map