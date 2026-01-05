import { CreateTRPCClientOptions, TRPCClient, TRPCClientError, TRPCUntypedClient } from "@trpc/client";
import { AnyRouter, ResponseMeta, inferClientTypes } from "@trpc/server/unstable-core-do-not-import";
import { TransformerOptions } from "@trpc/client/unstable-internals";
import { QueryClient } from "@tanstack/react-query";
import { CreateTRPCReactOptions, CreateTRPCReactQueryClientConfig } from "@trpc/react-query/shared";
import { NextComponentType, NextPageContext } from "next/dist/shared/lib/utils";

//#region src/withTRPC.d.ts

type WithTRPCConfig<TRouter extends AnyRouter> = CreateTRPCClientOptions<TRouter> & CreateTRPCReactQueryClientConfig & {
  abortOnUnmount?: boolean;
};
type WithTRPCOptions<TRouter extends AnyRouter> = CreateTRPCReactOptions<TRouter> & {
  config: (info: {
    ctx?: NextPageContext;
  }) => WithTRPCConfig<TRouter>;
} & TransformerOptions<inferClientTypes<TRouter>>;
type TRPCPrepassHelper = (opts: {
  parent: WithTRPCSSROptions<AnyRouter>;
  WithTRPC: NextComponentType<any, any, any>;
  AppOrPage: NextComponentType<any, any, any>;
}) => void;
type WithTRPCSSROptions<TRouter extends AnyRouter> = WithTRPCOptions<TRouter> & {
  /**
   * If you enable this, you also need to add a `ssrPrepass`-prop
   * @see https://trpc.io/docs/client/nextjs/ssr
   */
  ssr: true | ((opts: {
    ctx: NextPageContext;
  }) => boolean | Promise<boolean>);
  responseMeta?: (opts: {
    ctx: NextPageContext;
    clientErrors: TRPCClientError<TRouter>[];
  }) => ResponseMeta;
  /**
   * use `import { ssrPrepass } from '@trpc/next/ssrPrepass'`
   * @see https://trpc.io/docs/client/nextjs/ssr
   */
  ssrPrepass: TRPCPrepassHelper;
};
type WithTRPCNoSSROptions<TRouter extends AnyRouter> = WithTRPCOptions<TRouter> & {
  ssr?: false;
};
type TRPCPrepassProps<TRouter extends AnyRouter, TSSRContext extends NextPageContext = NextPageContext> = {
  config: WithTRPCConfig<TRouter>;
  queryClient: QueryClient;
  trpcClient: TRPCUntypedClient<TRouter> | TRPCClient<TRouter>;
  ssrState: 'prepass';
  ssrContext: TSSRContext;
};
declare function withTRPC<TRouter extends AnyRouter, TSSRContext extends NextPageContext = NextPageContext>(opts: WithTRPCNoSSROptions<TRouter> | WithTRPCSSROptions<TRouter>): (AppOrPage: NextComponentType<any, any, any>) => NextComponentType;
//#endregion
export { TRPCPrepassHelper, TRPCPrepassProps, WithTRPCConfig, WithTRPCNoSSROptions, WithTRPCSSROptions, withTRPC };
//# sourceMappingURL=withTRPC.d-DctYN4Yz.d.cts.map