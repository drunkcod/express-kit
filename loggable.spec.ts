import { describe, it, expect } from '@jest/globals'
import { asLoggableError } from './loggable'
import { assertOwn, hasOwn } from '@drunkcod/argis'
import { onceAsync } from './index';

const expectStack = (x: unknown) => {
    if(x == null || typeof x !== 'object') throw new Error('Expected object');
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

    it('exposes stack from Error', () => {
        const error = asLoggableError(new Error('The Error.'));
        expectStack(error);
    })

    it('makes Error.cause loggable', () => {
        const error = asLoggableError(new Error('The Error', { cause: new Error('The Cause') }));
        assertOwn(error, 'cause');
        expectStack(error.cause);
    });

    it('makes any cause loggable', () => {
        const error = asLoggableError({ cause: new Error('The Cause') });
        assertOwn(error, 'cause');
        expectStack(error.cause);
    });

    it('makes any cause loggable', () => {
        const error = asLoggableError({ cause: "it went wrong" });
        assertOwn(error, 'cause');
        expect(error.cause).toEqual('it went wrong');
    });

    it('doesn\´t modify input', () => {
        const input = Object.freeze({ message: 'hello world' });
        const error = asLoggableError(input);
        expect({
            areSame: error == input,
            inputHasStack: hasOwn(input, 'stack'),
            resultHasStack: hasOwn(error, 'stack'),
        }).toMatchObject({
            areSame: false,
            inputHasStack: false,
            resultHasStack: true,
        });
    });
});

describe('onceAsync', () => {
    it('invokes target only once', async () => {
        let n = 0;
        const fn = onceAsync(async () => (++n));

        const [first, second] = await Promise.all([fn(), fn()]);
        expect({ first, second }).toMatchObject({ first: 1, second: 1 });
    });
});