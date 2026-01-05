import { ActionHandlerDef, CreateTRPCNextAppRouterOptions, TRPCActionHandler } from "../server.d-DLnegS7F.cjs";
import { CreateTRPCClientOptions, TRPCClient, TRPCClientError, TRPCLink, TRPCProcedureOptions } from "@trpc/client";
import { AnyRouter, InferrableClientTypes, MaybePromise, Simplify, TypeError, inferClientTypes } from "@trpc/server/unstable-core-do-not-import";
import { TransformerOptions } from "@trpc/client/unstable-internals";

//#region src/app-dir/create-action-hook.d.ts
type MutationArgs<TDef extends ActionHandlerDef> = TDef['input'] extends void ? [input?: undefined | void, opts?: TRPCProcedureOptions] : [input: FormData | TDef['input'], opts?: TRPCProcedureOptions];
interface UseTRPCActionBaseResult<TDef extends ActionHandlerDef> {
  mutate: (...args: MutationArgs<TDef>) => void;
  mutateAsync: (...args: MutationArgs<TDef>) => Promise<TDef['output']>;
}
interface UseTRPCActionSuccessResult<TDef extends ActionHandlerDef> extends UseTRPCActionBaseResult<TDef> {
  data: TDef['output'];
  error?: never;
  status: 'success';
}
interface UseTRPCActionErrorResult<TDef extends ActionHandlerDef> extends UseTRPCActionBaseResult<TDef> {
  data?: never;
  error: TRPCClientError<TDef['errorShape']>;
  status: 'error';
}
interface UseTRPCActionIdleResult<TDef extends ActionHandlerDef> extends UseTRPCActionBaseResult<TDef> {
  data?: never;
  error?: never;
  status: 'idle';
}
interface UseTRPCActionLoadingResult<TDef extends ActionHandlerDef> extends UseTRPCActionBaseResult<TDef> {
  data?: never;
  error?: never;
  status: 'loading';
}
type UseTRPCActionResult<TDef extends ActionHandlerDef> = UseTRPCActionErrorResult<TDef> | UseTRPCActionIdleResult<TDef> | UseTRPCActionLoadingResult<TDef> | UseTRPCActionSuccessResult<TDef>;
declare function experimental_serverActionLink<TInferrable extends InferrableClientTypes>(...args: InferrableClientTypes extends TInferrable ? [TypeError<'Generic parameter missing in `experimental_createActionHook<HERE>()` or experimental_serverActionLink<HERE>()'>] : inferClientTypes<TInferrable>['transformer'] extends true ? [opts: TransformerOptions<{
  transformer: true;
}>] : [opts?: TransformerOptions<{
  transformer: false;
}>]): TRPCLink<TInferrable>;
interface UseTRPCActionOptions<TDef extends ActionHandlerDef> {
  onSuccess?: (result: TDef['output']) => MaybePromise<void> | void;
  onError?: (result: TRPCClientError<TDef['errorShape']>) => MaybePromise<void>;
}
declare function experimental_createActionHook<TInferrable extends InferrableClientTypes>(opts: InferrableClientTypes extends TInferrable ? TypeError<'Generic parameter missing in `experimental_createActionHook<HERE>()`'> : CreateTRPCClientOptions<TInferrable>): <TDef extends ActionHandlerDef>(handler: TRPCActionHandler<TDef>, useActionOpts?: UseTRPCActionOptions<Simplify<TDef>>) => UseTRPCActionResult<TDef>;
//#endregion
//#region src/app-dir/client.d.ts
declare function experimental_createTRPCNextAppDirClient<TRouter extends AnyRouter>(opts: CreateTRPCNextAppRouterOptions<TRouter>): TRPCClient<TRouter>;
//# sourceMappingURL=client.d.ts.map

//#endregion
export { UseTRPCActionResult, experimental_createActionHook, experimental_createTRPCNextAppDirClient, experimental_serverActionLink };
//# sourceMappingURL=client.d.cts.map