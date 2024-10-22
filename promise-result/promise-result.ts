declare global {
    export interface Promise<T> {
        result(): Promise<[null, T] | [Error, undefined]>;
    }
}

export class RejectionError extends Error {
    constructor(message: string, public reason: unknown) {
        super(message);
        this.name = 'RejectionError';
    }
}

Promise.prototype.result = async function() {
    try {
        const r = await this;
        return [null, r];
    } catch(err: unknown) {
        return [ensureError(err), undefined];
    }
}

const ensureError = (err: unknown) => {
    if(err instanceof Error) return err;
    const { stackTraceLimit } = Error;
    const e = new RejectionError('Promise rejected.', err);
    Error.stackTraceLimit = stackTraceLimit;
    Error.captureStackTrace(e, Promise.prototype.result);
    return e;
}