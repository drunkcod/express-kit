import { hasOwn } from '@drunkcod/argis';

export function at(message?: string) {
	const old = Error.stackTraceLimit;
	try {
		const r = { stack: '' };
		Error.stackTraceLimit = 1;
		Error.captureStackTrace(r, at);
		message = message ? `${message} ` : '';
		return message + r.stack.substring(10);
	} finally {
		Error.stackTraceLimit = old;
	}
}

function loggableStack(message: string | undefined, stopAt: Function) {
	const s: { stack?: string } = {};
	Error.captureStackTrace(s, stopAt);
	if (message) message = `: ${message}`;
	else message = '';
	return `LoggableError${message}\n` + s.stack?.substring(6);
}

type LoggableCause = { message?: unknown; cause?: unknown; stack?: string };

function asLoggableCause(cause: null, seen?: WeakSet<object>): null;
function asLoggableCause(cause: unknown, seen?: WeakSet<object>): LoggableCause;
function asLoggableCause(cause: unknown, seen = new WeakSet<object>()): null | LoggableCause {
	if (cause == null) return null;
	if (typeof cause !== 'object') return { message: cause };
	if (seen.has(cause)) return { message: '[Circular Reference]' };
	seen.add(cause);

	if (hasOwnJSON(cause)) return asLoggableCause(cause.toJSON(), seen);
	if (cause instanceof Error || hasOwn(cause, 'cause')) {
		const { message, stack, cause: innerCause, ...rest } = cause as any;
		const r: { message: unknown; stack?: string; cause?: unknown } = { message };
		if (innerCause) {
			const loggableInner = asLoggableCause(innerCause, seen);
			r.cause = loggableInner;
			r.message ??= loggableInner.message;
		}
		if (stack) r.stack = stack;
		return Object.assign(r, rest);
	}
	return cause;
}

export function asLoggableError(error: unknown) {
	if (error instanceof Error) return asLoggableCause(error);
	const { message, ...rest } = error && typeof error === 'object' ? asLoggableCause(error) : { message: error };
	return { message, stack: loggableStack(message?.toString(), asLoggableError), ...rest };
}

export function hasOwnJSON(x: object): x is { toJSON(): unknown } {
	return 'toJSON' in x && typeof x.toJSON === 'function';
}
