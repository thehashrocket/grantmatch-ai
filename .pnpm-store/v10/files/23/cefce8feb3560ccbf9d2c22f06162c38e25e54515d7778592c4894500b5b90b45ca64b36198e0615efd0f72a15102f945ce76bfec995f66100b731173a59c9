import { CreateTRPCClientOptions, Resolver, TRPCClient, TRPCUntypedClient } from "@trpc/client";
import { AnyClientTypes, AnyProcedure, AnyRootTypes, AnyRouter, ErrorHandlerOptions, MaybePromise, ProcedureType, ProtectedIntersection, RootConfig, RouterRecord, Simplify, TRPCResponse, inferClientTypes, inferProcedureInput, inferTransformedProcedureOutput } from "@trpc/server/unstable-core-do-not-import";
import { CreateContextCallback, inferProcedureOutput } from "@trpc/server";

//#region src/app-dir/shared.d.ts

/**
 * @internal
 */
interface CreateTRPCNextAppRouterOptions<TRouter extends AnyRouter> {
  config: () => CreateTRPCClientOptions<TRouter>;
}
/**
 * @internal
 */

/**
 * @internal
 */
interface ActionHandlerDef {
  input?: any;
  output?: any;
  errorShape: any;
}
/**
 * @internal
 */
type inferActionDef<TRoot extends AnyClientTypes, TProc extends AnyProcedure> = {
  input: inferProcedureInput<TProc>;
  output: inferProcedureOutput<TProc>;
  errorShape: TRoot['errorShape'];
};
//#endregion
//#region src/app-dir/types.d.ts
type ResolverDef = {
  input: any;
  output: any;
  transformer: boolean;
  errorShape: any;
};
type DecorateProcedureServer<TType extends ProcedureType, TDef extends ResolverDef> = TType extends 'query' ? {
  query: Resolver<TDef>;
  revalidate: (input?: TDef['input']) => Promise<{
    revalidated: false;
    error: string;
  } | {
    revalidated: true;
  }>;
} : TType extends 'mutation' ? {
  mutate: Resolver<TDef>;
} : TType extends 'subscription' ? {
  subscribe: Resolver<TDef>;
} : never;
type NextAppDirDecorateRouterRecord<TRoot extends AnyRootTypes, TRecord extends RouterRecord> = { [TKey in keyof TRecord]: TRecord[TKey] extends infer $Value ? $Value extends AnyProcedure ? DecorateProcedureServer<$Value['_def']['type'], {
  input: inferProcedureInput<$Value>;
  output: inferTransformedProcedureOutput<TRoot, $Value>;
  errorShape: TRoot['errorShape'];
  transformer: TRoot['transformer'];
}> : $Value extends RouterRecord ? NextAppDirDecorateRouterRecord<TRoot, $Value> : never : never };
//#endregion
//#region src/app-dir/server.d.ts
declare function experimental_createTRPCNextAppDirServer<TRouter extends AnyRouter>(opts: CreateTRPCNextAppRouterOptions<TRouter>): NextAppDirDecorateRouterRecord<TRouter["_def"]["_config"]["$types"], TRouter["_def"]["record"]>;
/**
 * @internal
 */
type TRPCActionHandler<TDef extends ActionHandlerDef> = (input: FormData | TDef['input']) => Promise<TRPCResponse<TDef['output'], TDef['errorShape']>>;
declare function experimental_createServerActionHandler<TInstance extends {
  _config: RootConfig<AnyRootTypes>;
}>(t: TInstance, opts: CreateContextCallback<TInstance['_config']['$types']['ctx'], () => MaybePromise<TInstance['_config']['$types']['ctx']>> & {
  /**
   * Transform form data to a `Record` before passing it to the procedure
   * @default true
   */
  normalizeFormData?: boolean;
  /**
   * Called when an error occurs in the handler
   */
  onError?: (opts: ErrorHandlerOptions<TInstance['_config']['$types']['ctx']>) => void;
  /**
   * Rethrow errors that should be handled by Next.js
   * @default true
   */
  rethrowNextErrors?: boolean;
}): <TProc extends AnyProcedure>(proc: TProc) => TRPCActionHandler<Simplify<inferActionDef<inferClientTypes<TInstance>, TProc>>>;
declare function experimental_revalidateEndpoint(req: Request): Promise<Response>;
//# sourceMappingURL=server.d.ts.map

//#endregion
export { ActionHandlerDef, CreateTRPCNextAppRouterOptions, TRPCActionHandler, experimental_createServerActionHandler, experimental_createTRPCNextAppDirServer, experimental_revalidateEndpoint };
//# sourceMappingURL=server.d-DLnegS7F.d.cts.map