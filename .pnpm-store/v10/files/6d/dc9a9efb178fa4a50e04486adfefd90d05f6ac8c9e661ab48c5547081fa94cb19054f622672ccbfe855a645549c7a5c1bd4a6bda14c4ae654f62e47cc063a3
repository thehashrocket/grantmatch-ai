import { TRPCPrepassHelper, TRPCPrepassProps, WithTRPCConfig, WithTRPCNoSSROptions, WithTRPCSSROptions, withTRPC } from "./withTRPC.d-DctYN4Yz.cjs";
import { AnyRouter, ProtectedIntersection } from "@trpc/server/unstable-core-do-not-import";
import { CreateReactUtils, DecorateRouterRecord, TRPCUseQueries, TRPCUseSuspenseQueries } from "@trpc/react-query/shared";
import { NextPageContext } from "next/types";

//#region src/createTRPCNext.d.ts

/**
 * @internal
 */
interface CreateTRPCNextBase<TRouter extends AnyRouter, TSSRContext extends NextPageContext> {
  /**
   * @deprecated renamed to `useUtils` and will be removed in a future tRPC version
   *
   * @see https://trpc.io/docs/v11/client/react/useUtils
   */
  useContext(): CreateReactUtils<TRouter, TSSRContext>;
  /**
   * @see https://trpc.io/docs/v11/client/react/useUtils
   */
  useUtils(): CreateReactUtils<TRouter, TSSRContext>;
  withTRPC: ReturnType<typeof withTRPC<TRouter, TSSRContext>>;
  useQueries: TRPCUseQueries<TRouter>;
  useSuspenseQueries: TRPCUseSuspenseQueries<TRouter>;
}
/**
 * @internal
 */
type CreateTRPCNext<TRouter extends AnyRouter, TSSRContext extends NextPageContext> = ProtectedIntersection<CreateTRPCNextBase<TRouter, TSSRContext>, DecorateRouterRecord<TRouter['_def']['_config']['$types'], TRouter['_def']['record']>>;
declare function createTRPCNext<TRouter extends AnyRouter, TSSRContext extends NextPageContext = NextPageContext>(opts: WithTRPCNoSSROptions<TRouter> | WithTRPCSSROptions<TRouter>): CreateTRPCNext<TRouter, TSSRContext>;
//# sourceMappingURL=createTRPCNext.d.ts.map

//#endregion
export { CreateTRPCNext, CreateTRPCNextBase, TRPCPrepassHelper, TRPCPrepassProps, WithTRPCConfig, WithTRPCNoSSROptions, WithTRPCSSROptions, createTRPCNext, withTRPC };
//# sourceMappingURL=index.d.cts.map