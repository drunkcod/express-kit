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
	if (error instanceof Error) return { error, stack: error.stack };
	const r: { stack?: string } = error ? typeof error !== 'object' ? { error } : error : { };
	Error.captureStackTrace(r, asLoggableError);
	return r;
}
