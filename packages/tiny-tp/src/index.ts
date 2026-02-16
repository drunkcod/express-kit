import type { Request, Response, NextFunction } from 'express';

import { AsyncLocalStorage } from 'node:async_hooks';
import { IdGenerator } from './IdGenerator.js';

const traceparentEx = /^([\da-f]{2})-([\da-f]{32})-([\da-f]{16})-([\da-f]{2})$/;

export const parseTraceparent = (input?: string) => {
	if (!input) return undefined;

	const r = input.match(traceparentEx);
	if (!r) return undefined;

	const [, version, traceId, parentId, flags] = r;
	if (version != '00') return undefined;

	const flagBits = parseInt(flags, 16);
	return {
		traceId,
		parentId,
		sampled: (flagBits & 1) === 1,
	};
};

export interface TraceContext {
	traceId: string;
	parentId?: string;
	spanId: string;
	sampled: boolean;
	traceState?: string;
}

const formatHeader = (ctx: TraceContext) => `00-${ctx.traceId}-${ctx.spanId}-${ctx.sampled ? '01' : '00'}`;

const ids = new IdGenerator();
const traceStorage = new AsyncLocalStorage<TraceContext>();

export const getTraceContext = () => traceStorage.getStore();

export const getTraceHeaders = (): {} | { traceparent: string; tracestate?: string } => {
	const ctx = getTraceContext();
	if (!ctx) return {};

	const headers = {
		traceparent: formatHeader(ctx),
	} as { traceparent: string; tracestate?: string };
	if (ctx.traceState) headers.tracestate = ctx.traceState;

	return headers;
};

export interface TracingOptions {
	samplingRate: number;
}

const makeTracingMiddleware = (options: TracingOptions) => (req: Request, res: Response, next: NextFunction) => {
	const stringOrUndefined = (x: unknown) => (x && typeof x === 'string' ? x : undefined);
	const parent = parseTraceparent(stringOrUndefined(req.headers['traceparent']));

	const sampled = parent?.sampled === true || options.samplingRate === 1.0 || Math.random() < options.samplingRate;

	const ctx = {
		traceId: parent?.traceId ?? ids.newTrace(),
		parentId: parent?.parentId,
		spanId: ids.newSpan(),
		sampled,
		traceState: stringOrUndefined(req.headers['tracestate']),
	} satisfies TraceContext;

	res.setHeader('traceparent', formatHeader(ctx));
	if (ctx.traceState) {
		res.setHeader('tracestate', ctx.traceState);
	}

	traceStorage.run(ctx, next);
};
const defaultMiddleware = makeTracingMiddleware({ samplingRate: 1.0 });

export function tracingMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void;
export function tracingMiddleware(options: TracingOptions): (req: Request, res: Response, next: NextFunction) => void;
export function tracingMiddleware(requestOrOptions?: Request | TracingOptions, response?: Response, next?: NextFunction) {
	switch (arguments.length) {
		default:
			throw new Error('Invalid number of arguments.');
		case 0:
			return defaultMiddleware;
		case 1:
			return makeTracingMiddleware(requestOrOptions as TracingOptions);
		case 3:
			return defaultMiddleware(requestOrOptions as Request, response!, next!);
	}
}
