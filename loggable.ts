import { hasOwn } from "@drunkcod/argis";

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

function asLoggableCause(cause: Error | object): object;
function asLoggableCause(cause: unknown): unknown;
function asLoggableCause(cause: unknown): unknown {
	if(cause == null || typeof cause !== 'object') return cause;
	if(hasOwnJSON(cause)) return asLoggableCause(cause.toJSON());
	if(cause instanceof Error) {
		const { message, stack, cause: innerCause, ...rest } = cause;
		return innerCause 
		? { message, stack, cause: asLoggableCause(innerCause), ...rest }
		: { message, stack, ...rest };
	}
	if(hasOwn(cause, 'cause')) {
		const { cause: innerCause, ...rest } = cause;
		return { ...rest, cause: asLoggableCause(innerCause) };
	}
	return { ...cause };
}

export function asLoggableError(error: unknown) {
	if (error instanceof Error) return asLoggableCause(error);
	const r = (error && typeof error === 'object') ? asLoggableCause(error) : { message: error };
	Error.captureStackTrace(r, asLoggableError);
	return Object.defineProperty(r, 'stack', { enumerable: true });
}

export function hasOwnJSON(x: object) : x is { toJSON(): unknown } { 
	return 'toJSON' in x && typeof x.toJSON === 'function';
}
