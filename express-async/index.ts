import type express from 'express';

type WithReturn<Type extends (...args: any) => any, R> = Type extends (...args: infer Args) => any ? (...args: Args) => R : never;
type IsEmptyObject<T extends Record<PropertyKey, unknown>> = [keyof T] extends [never] ? true : false;

type RequestHandler<T, Req extends express.Request<any> = express.Request<any>> =
	| ((req: Req, res: express.Response<any>) => Promise<T>)
	| ((req: Req, res: express.Response<any>, next: express.NextFunction) => Promise<T>);

type RequestParams = [express.Request<any>, express.Response] | [express.Request<any>, express.Response, express.NextFunction];

type ErrorParams = [Error, express.Request<any>, express.Response, express.NextFunction];

type IsRequestHandler<T, P extends keyof T> = T[P] extends (...args: any) => any ? (Parameters<T[P]> extends RequestParams ? P : never) : never;

type IsErrorHandler<T, P extends keyof T> = T[P] extends (...args: any) => any ? (Parameters<T[P]> extends ErrorParams ? P : never) : never;

type ErrorHandler<T> = WithReturn<express.ErrorRequestHandler, Promise<T>>;

type HandlerFns<C> = { [P in keyof C as IsRequestHandler<C, P>]: C[P] };
type HandlerErrorFns<C> = { [P in keyof C as IsErrorHandler<C, P>]: C[P] };

type ControllerHandlerFns<C> = IsEmptyObject<HandlerFns<C>> extends true ? never : HandlerFns<C>;
type ControllerErrorFns<C> = IsEmptyObject<HandlerErrorFns<C>> extends true ? never : HandlerErrorFns<C>;

type ControllerFns<C> = ControllerHandlerFns<C> | ControllerErrorFns<C>;

type Unwrap<T> = T extends Promise<infer U> ? U : T;

const safeResolve = <Fn extends (...args: any) => any>(fn: Fn, thisArg: ThisParameterType<Fn>, ...args: Parameters<Fn>) => {
	type ReturnT = Unwrap<ReturnType<Fn>>;
	try {
		return Promise.resolve<ReturnT>(fn.call(thisArg, ...args));
	} catch (reason) {
		return Promise.reject<ReturnT>(reason);
	}
};

type AnyFn = (...args: any[]) => any;
interface AsyncFn<P extends [...any], T> {
	(...args: [...P]): Promise<T>;
}

type HandlerParameters<R extends express.Request> = [request: R, response: express.Response, next: express.NextFunction];

type IsFn<T, P extends keyof T> = T[P] extends (...args: any) => any ? P : never;
type Fns<T> = { [P in keyof T as IsFn<T, P>]: T[P] };

export const as = <T>(x: T) => x;
export function bind<T extends Fns<T>, K extends keyof T>(target: T, fn: K): T[K] {
	return as<Function>(target[fn]).bind(target);
}

export function asyncHandler<T, Req extends express.Request>(fn: AsyncFn<HandlerParameters<Req>, T>): RequestHandler<T>;
export function asyncHandler<T, Req extends express.Request>(fn: AsyncFn<[error: Error, ...HandlerParameters<Req>], T>): ErrorHandler<T>;
export function asyncHandler<T>(fn: (...args: any) => Promise<T>): RequestHandler<any> | ErrorHandler<any> {
	switch (fn.length) {
		default:
		case 2:
		case 3:
			return (req: express.Request, res: express.Response, next: express.NextFunction) => safeResolve(fn, null, req, res, next).catch(next);

		case 4:
			return (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => safeResolve(fn, null, error, req, res, next).catch(next);
	}
}

export function boundAsyncHandler<C extends ControllerHandlerFns<C>, T>(x: C, m: keyof ControllerHandlerFns<C>): RequestHandler<unknown>;
export function boundAsyncHandler<C extends ControllerErrorFns<C>, T>(x: C, m: keyof ControllerErrorFns<C>): ErrorHandler<unknown>;
export function boundAsyncHandler<C extends ControllerFns<C>>(x: C, m: keyof ControllerFns<C>): RequestHandler<unknown> | ErrorHandler<unknown> {
	return asyncHandler(bind(x, m));
}

interface ControllerFactory<C> {
	(req: express.Request, res: express.Response): C;
}

type ControllerRequestFn<C> =
	| ((this: C, req: express.Request<any>, res: express.Response) => Promise<unknown>)
	| ((this: C, req: express.Request<any>, res: express.Response, next: express.NextFunction) => Promise<unknown>);

type ControllerErrorFn<C> = (this: C, error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => Promise<unknown>;

export function controllerHandler<C>(factory: ControllerFactory<C>, m: ControllerRequestFn<C>): RequestHandler<unknown>;
export function controllerHandler<C>(factory: ControllerFactory<C>, m: ControllerErrorFn<C>): ErrorHandler<unknown>;
export function controllerHandler<C>(factory: ControllerFactory<C>, m: (...args: any) => Promise<unknown>): RequestHandler<unknown> | ErrorHandler<unknown> {
	switch (m.length) {
		default:
		case 2:
		case 3:
			return async (req: express.Request<any>, res: express.Response, next: express.NextFunction) => {
				try {
					const c = factory(req, res);
					return await safeResolve(m, c, req, res, next);
				} catch (error) {
					next(error);
				}
			};

		case 4:
			return async (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
				try {
					const c = factory(req, res);
					return await safeResolve(m, c, error, req, res, next);
				} catch (error) {
					next(error);
				}
			};
	}
}

export class AsyncBinder<C extends ControllerFns<C>> {
	static for<Controller extends ControllerFns<Controller>>(controller: Controller) {
		const self = new AsyncBinder(controller);
		return self.bind.bind(self);
	}

	constructor(private controller: C) {}

	bind(m: keyof ControllerHandlerFns<C>): RequestHandler<unknown>;
	bind(m: keyof ControllerErrorFns<C>): ErrorHandler<unknown>;
	bind(m: keyof ControllerFns<C>): RequestHandler<unknown> | ErrorHandler<unknown> {
		return asyncHandler(bind(this.controller, m));
	}
}

export class ControllerBinder<C extends ControllerFns<C>> {
	static for<Controller extends ControllerFns<Controller>>(controller: Controller) {
		const self = new AsyncBinder(controller);
		return self.bind.bind(self);
	}

	constructor(private factory: ControllerFactory<C>) {}

	bind(m: ControllerRequestFn<C>): RequestHandler<unknown>;
	bind(m: ControllerErrorFn<C>): ErrorHandler<unknown>;
	bind(m: (...args: any) => Promise<unknown>): RequestHandler<unknown> | ErrorHandler<unknown> {
		return controllerHandler(this.factory, m);
	}
}
