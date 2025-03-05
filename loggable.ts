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

type LoggableCause = { message: unknown; cause?: unknown; stack?: string };

function asLoggableCause(cause: null): null;
function asLoggableCause(cause: unknown): LoggableCause;
function asLoggableCause(cause: unknown): null | LoggableCause {
	if (cause == null) return null;
	if (typeof cause !== 'object') return { message: cause };
	if (hasOwnJSON(cause)) return asLoggableCause(cause.toJSON());
	if (cause instanceof Error || hasOwn(cause, 'cause')) {
		const { message, stack, cause: innerCause, ...rest } = cause as any;
		const r: { message: unknown; stack?: string; cause?: unknown } = { message };
		if (innerCause) {
			const loggableInner = asLoggableCause(innerCause);
			r.cause = loggableInner;
			r.message ??= loggableInner.message;
		}
		if (stack) r.stack = stack;
		return Object.assign(r, rest);
	}
	return { message: '', ...cause };
}

export function asLoggableError(error: unknown) {
	if (error instanceof Error) return asLoggableCause(error);
	const { message, ...rest } = error && typeof error === 'object' ? asLoggableCause(error) : { message: error };
	return { message, stack: loggableStack(message?.toString(), asLoggableError), ...rest };
}

export function hasOwnJSON(x: object): x is { toJSON(): unknown } {
	return 'toJSON' in x && typeof x.toJSON === 'function';
}
