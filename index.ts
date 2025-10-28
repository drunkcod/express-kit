import type express from 'express';

import { Stopwatch, Timespan } from './stopwatch.js';
export * from '@drunkcod/express-async';
export * from './loggable.js';
export * from './stopwatch.js';

type AsyncFn<T> = () => Promise<T>;
type ExpressServer = ReturnType<express.Application['listen']>;

export type ErrorHandler = (error: Error, request: express.Request, response: express.Response, next: express.NextFunction) => void;

export type WithReqBody<T, ReqBody> = T extends express.Request<infer P, infer ResBody, unknown, infer Query, infer Locals>
	? express.Request<P, ResBody, ReqBody, Query, Locals>
	: never;

export function onceAsync<T>(fn: AsyncFn<T>): AsyncFn<T> {
	let p: Promise<T>;
	return () => {
		if (p) return p;
		p = fn();
		fn = () => p;
		return p;
	};
}

export function mergeCallsAsync<T>(fn: AsyncFn<T>): AsyncFn<T> {
	let p: Promise<T> | null;
	return async () => {
		if (!p) p = fn();
		try {
			return await p;
		} finally {
			p = null;
		}
	};
}

interface Listener<T> {
	listen(cb: () => void): T;
	listen(port: number, cb: () => void): T;
}

export const listenAsync = <T>(server: Listener<T>, options?: { port?: number }) =>
	new Promise<T>((resolve, reject) => {
		try {
			if (options?.port) {
				const r = server.listen(options.port, () => resolve(r));
			} else {
				const r = server.listen(() => resolve(r));
			}
		} catch (err) {
			reject(err);
		}
	});

export const closeAsync = (server: { close: (cb: (error?: Error) => void) => void }) =>
	new Promise<void>((resolve, reject) =>
		server.close((err) => {
			if (err) reject(err);
			else resolve();
		})
	);

export function registerShutdown<Server extends ExpressServer = ExpressServer>(server: Server, shutdown?: () => Promise<unknown>) {
	const onShutdown = onceAsync(async () => {
		await closeAsync(server);
		if (shutdown) await shutdown();
	});
	process.on('SIGINT', onShutdown);
	process.on('SIGTERM', onShutdown);
}

export const requestTimingMiddleware =
	(onRequestFinish: (req: express.Request, duration: Timespan) => void) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
		const s = Stopwatch.startNew();
		res.on('finish', () => onRequestFinish(req, s.elapsed));
		next();
	};
