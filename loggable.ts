import { hasOwn, hasKey } from '@drunkcod/argis';

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

type LoggableCause = { message: unknown; cause?: unknown; stack?: string };

function asLoggableCause(cause: null): null;
function asLoggableCause(cause: unknown): LoggableCause;
function asLoggableCause(cause: unknown): null | LoggableCause {
	if (cause == null) return null;
	if (typeof cause !== 'object') return { message: cause };
	if (hasOwnJSON(cause)) return asLoggableCause(cause.toJSON());
	if (cause instanceof Error || hasOwn(cause, 'cause')) {
		const { message, stack, cause: innerCause, ...rest } = cause as any;
		const r: { message: unknown; cause?: unknown; stack?: string } = { message, ...rest };
		if (innerCause) {
			const loggableInner = asLoggableCause(innerCause);
			r.cause = loggableInner;
			r.message ??= loggableInner.message;
		}
		if (stack) r.stack = stack;
		return r;
	}
	return { message: cause.toString(), ...cause };
}

export function asLoggableError(error: unknown) {
	if (error instanceof Error) return asLoggableCause(error);
	const r = error && typeof error === 'object' ? asLoggableCause(error) : { message: error };
	Error.captureStackTrace(r, asLoggableError);
	return Object.defineProperty(r, 'stack', { enumerable: true });
}

export function hasOwnJSON(x: object): x is { toJSON(): unknown } {
	return 'toJSON' in x && typeof x.toJSON === 'function';
}
