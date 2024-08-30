import { describe, it, expect } from '@jest/globals'
import { asLoggableError } from './loggable'
import { assertOwn } from '@drunkcod/argis'

const expectStack = <T extends object>(x: T) => {
    expect(Object.keys(x)).toContain('stack');
    assertOwn(x, 'stack');
    expect(typeof x.stack).toEqual('string');
}

describe('asLoggableError', () => {
    it('gives a stackish for null input', () => {
        const error = asLoggableError(null);
        expectStack(error);
    });

    it('error for non object', () => {
        const error = asLoggableError('hello world') as any;
        expect(error.message).toEqual('hello world');
        expectStack(error);
    });

    it('adds stack to any object', () => {
        const error = asLoggableError({ value: 42});
        expectStack(error);
    });
});