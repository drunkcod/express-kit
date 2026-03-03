import type express from 'express';

type WithReturn<Type extends (...args: any) => any, R> = Type extends (...args: infer Args) => any ? (...args: Args) => R : never;

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

type ControllerFns<C> = HandlerFns<C> & HandlerErrorFns<C>;

const tryCall = <Fn extends (...args: any) => any>(fn: Fn, thisArg: ThisParameterType<Fn>, ...args: Parameters<Fn>): Promise<Awaited<ReturnType<Fn>>> =>
	Promise.try(Reflect.apply, fn, thisArg, args);

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

type AsyncHandler<T, Req extends express.Request> = AsyncFn<HandlerParameters<Req>, T>;
type AsyncErrorHandler<T, Req extends express.Request> = AsyncFn<[error: Error, ...HandlerParameters<Req>], T>;

export function asyncHandler<T, Req extends express.Request>(fn: AsyncHandler<T, Req>): RequestHandler<T>;
export function asyncHandler<T, Req extends express.Request>(fn: AsyncErrorHandler<T, Req>): ErrorHandler<T>;
export function asyncHandler<T, Req extends express.Request>(fn: AsyncHandler<T, Req> | AsyncErrorHandler<T, Req>): RequestHandler<any> | ErrorHandler<any>;
export function asyncHandler<T>(fn: (...args: any) => Promise<T>): RequestHandler<any> | ErrorHandler<any> {
	switch (fn.length) {
		default:
		case 2:
		case 3:
			return (req: express.Request, res: express.Response, next: express.NextFunction) => Promise.try(fn, req, res, next).catch(next);

		case 4:
			return (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => Promise.try(fn, error, req, res, next).catch(next);
	}
}

export function boundAsyncHandler<C extends HandlerFns<C>, T>(x: C, m: keyof HandlerFns<C>): RequestHandler<unknown>;
export function boundAsyncHandler<C extends HandlerErrorFns<C>, T>(x: C, m: keyof HandlerErrorFns<C>): ErrorHandler<unknown>;
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
			return (req: express.Request<any>, res: express.Response, next: express.NextFunction) =>
				Promise.try(factory, req, res)
					.then((c) => tryCall(m, c, req, res, next))
					.catch(next);

		case 4:
			return (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) =>
				Promise.try(factory, req, res)
					.then((c) => tryCall(m, c, error, req, res, next))
					.catch(next);
	}
}

export class AsyncBinder<C extends ControllerFns<C>> {
	static for<Controller extends ControllerFns<Controller>>(controller: Controller) {
		const self = new AsyncBinder(controller);
		return self.bind.bind(self);
	}

	constructor(private controller: C) {}

	bind(m: keyof HandlerFns<C>): RequestHandler<unknown>;
	bind(m: keyof HandlerErrorFns<C>): ErrorHandler<unknown>;
	bind(fn: ControllerRequestFn<C>): RequestHandler<unknown>;
	bind(fn: ControllerErrorFn<C>): ErrorHandler<unknown>;
	bind(nameOrFn: keyof ControllerFns<C> | ControllerRequestFn<C> | ControllerErrorFn<C>): RequestHandler<unknown> | ErrorHandler<unknown> {
		if (typeof nameOrFn !== 'function') return asyncHandler(bind(this.controller, nameOrFn));
		return asyncHandler(nameOrFn.bind(this.controller));
	}
}

export class ControllerBinder<C extends ControllerFns<C>> {
	constructor(private factory: ControllerFactory<C>) {}

	bind(m: ControllerRequestFn<C>): RequestHandler<unknown>;
	bind(m: ControllerErrorFn<C>): ErrorHandler<unknown>;
	bind(m: (...args: any) => Promise<unknown>): RequestHandler<unknown> | ErrorHandler<unknown> {
		return controllerHandler(this.factory, m);
	}
}
