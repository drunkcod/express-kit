import type express from 'express'

type WithReturn<Type extends (...args: any) => any, R> = Type extends (...args: infer Args) => any ? (...args: Args) => R : never;
type IsEmptyObject<T extends Record<PropertyKey, unknown>> = [keyof T] extends [never] ? true : false;

type RequestHandler<T, Req extends express.Request<any> = express.Request<any>> = 
    ((req: Req, res: express.Response<any>) => Promise<T>)
    | ((req: Req, res: express.Response<any>, next: express.NextFunction) => Promise<T>)

type RequestParams = 
      [express.Request<any>, express.Response] 
    | [express.Request<any>, express.Response, express.NextFunction];

type ErrorParams = [Error, express.Request<any>, express.Response, express.NextFunction];

type IsRequestHandler<T, P extends keyof T> = 
    T[P] extends (...args:any) => any ? Parameters<T[P]> extends RequestParams ? P : never : never;

type IsErrorHandler<T, P extends keyof T> =
    T[P] extends (...args:any) => any ? Parameters<T[P]> extends ErrorParams ? P : never : never

type ErrorHandler<T> = WithReturn<express.ErrorRequestHandler, Promise<T>>;

type HandlerFns<C> = { [P in keyof C as IsRequestHandler<C, P>]: C[P] };
type HandlerErrorFns<C> = { [P in keyof C as IsErrorHandler<C, P>]: C[P] };

type ControllerHandlerFns<C> = IsEmptyObject<HandlerFns<C>> extends true ? never : HandlerFns<C>;
type ControllerErrorFns<C> = IsEmptyObject<HandlerErrorFns<C>> extends true ? never : HandlerErrorFns<C>;

type ControllerFns<C> = ControllerHandlerFns<C> | ControllerErrorFns<C>

type Unwrap<T> = T extends Promise<infer U> ? U : T; 

const safeResolve = <Fn extends (...args: any) => any>(fn: Fn, ...args: Parameters<Fn>) => {
    type ReturnT = Unwrap<ReturnType<Fn>>
    try {
        return Promise.resolve<ReturnT>(fn(...args))
    } catch(reason) {
        return Promise.reject<ReturnT>(reason);
    }
}

type HandlerFn<Req, T>  = 
    Req extends [never] ? never :
    ((...args: [request: Req, response: express.Response]) => Promise<T>) 
    | ((...args: [request: Req, response: express.Response, next: express.NextFunction]) => Promise<T>)

type ErrorHandlerFn<Req, T>  = 
    Req extends [never] ? never :
    ((...args: [errpr: Error, request: Req, response: express.Response, next: express.NextFunction]) => Promise<T>) 

export const as = <T>(x: T) => x;

export function asyncHandler<T, Req extends express.Request = express.Request<any>>(fn: HandlerFn<Req, T>) :  RequestHandler<T> 
export function asyncHandler<T, Req extends express.Request = express.Request<any>>(fn: ErrorHandlerFn<Req, T>) : ErrorHandler<T>
export function asyncHandler<T>(fn: (...args:any) => Promise<T>): RequestHandler<any> | ErrorHandler<any> {
    switch(fn.length) {
        case 2:
        case 3: return (req: express.Request, res: express.Response, next: express.NextFunction) => safeResolve(fn, req, res, next).catch(next);

        case 4: return (error: any, req: express.Request, res:express.Response, next: express.NextFunction) => 
            safeResolve(fn, error, req, res, next).catch(next);

        default: return (...args:any[]) => {
            const next = args.pop();
            return safeResolve(fn, ...args, next).catch(next);
        }
    }
}

export function boundAsyncHandler<C extends ControllerHandlerFns<C>, T>(x: C, m: keyof ControllerHandlerFns<C>): RequestHandler<unknown>;
export function boundAsyncHandler<C extends ControllerErrorFns<C>, T>(x: C, m: keyof ControllerErrorFns<C>): ErrorHandler<unknown>;
export function boundAsyncHandler<C extends ControllerFns<C>>(x: C, m: keyof ControllerFns<C>): RequestHandler<unknown> | ErrorHandler<unknown> {
    return asyncHandler(as<Function>(x[m]).bind(x));
}

export class AsyncBinder<Controller extends ControllerFns<Controller>> {
    constructor(private controller: Controller) {}

    bind<T>(m: keyof ControllerHandlerFns<Controller>): RequestHandler<unknown>;
    bind<T>(m: keyof ControllerErrorFns<Controller>): ErrorHandler<unknown>;
    bind(m: keyof ControllerFns<Controller>): RequestHandler<unknown> | ErrorHandler<unknown> {
        const x = this.controller;
        return asyncHandler(as<Function>(x[m]).bind(x));
    }
}
