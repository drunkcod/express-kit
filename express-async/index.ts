import express from 'express'

type WithReturn<Type extends (...args: any) => any, R> = Type extends (...args: infer Args) => any ? (...args: Args) => R : never;
type OfType<T, P extends keyof T, X> = T[P] extends X ? P : never;
type IsEmptyObject<T extends Record<PropertyKey, unknown>> = [keyof T] extends [never] ? true : false;

type RequestHandler<T> = 
    ((req: express.Request<any>, res: express.Response<any>) => Promise<T>)
    | ((req: express.Request<any>, res: express.Response<any>, next: express.NextFunction) => Promise<T>)


type RouteHandler<T> = WithReturn<RequestHandler<T>, Promise<T>>;
type ErrorHandler<T> = WithReturn<express.ErrorRequestHandler, Promise<T>>;

type HandlerFns<T, R> = { [P in keyof T as OfType<T, P, RouteHandler<R>>]: T[P] };
type ControllerFns<T, R> = IsEmptyObject<HandlerFns<T, R>> extends true ? never : HandlerFns<T, R>;

const rejected = <T>(cause: any) => new Promise<T>((_, reject) => reject(cause));
const safeResolve = <T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) => {
    try {
        return Promise.resolve(fn(...args))
    } catch(err) {
        return rejected(err);
    }
}

export function asyncHandler<T>(fn: (req: express.Request<any>, res: express.Response) => Promise<T>) :  RouteHandler<T> 
export function asyncHandler<T>(fn: (req: express.Request<any>, res: express.Response, next: express.NextFunction) => Promise<T>) :  RouteHandler<T>
export function asyncHandler<T>(fn: (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => Promise<T>) : ErrorHandler<T>
export function asyncHandler<T>(fn: (...args:any[]) => Promise<T>): RouteHandler<any> | ErrorHandler<any> {
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

const getFn = <T extends ControllerFns<T, R>, R>(x: T, m: keyof ControllerFns<T, R>): RouteHandler<R> => x[m];

export const boundAsyncHandler = <T extends ControllerFns<T, R>, R>(x: T, m: keyof ControllerFns<T, R>) =>
    asyncHandler(getFn(x, m).bind(x));
