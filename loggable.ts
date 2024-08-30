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

export function asLoggableError(error: unknown) {
	if (error instanceof Error) {
		const { message, stack, ...rest } = error;
		return { message, stack, ...rest };
	}
	const r = (error && typeof error === 'object') ? error : { message: error };
	Error.captureStackTrace(r, asLoggableError);
	return Object.defineProperty(r, 'stack', { enumerable: true });
}
