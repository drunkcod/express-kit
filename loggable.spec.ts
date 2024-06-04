import { describe, it, expect } from '@jest/globals'
import { asLoggableError } from './loggable'

describe('asLoggableError', () => {
    it('gives a stackish for null input', () => {
        const error = asLoggableError(null);
        expect(error.stack).not.toBeNull();
    });

    it('error for non object', () => {
        const error = asLoggableError('hello world') as any;
        expect(error.error).toEqual('hello world');
    });

    it('adds stack to any object', () => {
        const error = asLoggableError({ value: 42});
        expect(error.stack).not.toBeNull();
    });
});