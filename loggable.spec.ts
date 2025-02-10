import { describe, it, test, expect } from '@jest/globals';
import { asLoggableError } from './loggable.js';
import { assertOwn, hasOwn } from '@drunkcod/argis';

const expectStack = (x: unknown) => {
	if (x == null || typeof x !== 'object') throw new Error('Expected object');
	expect(Object.keys(x)).toContain('stack');
	assertOwn(x, 'stack');
	expect(typeof x.stack).toEqual('string');
};

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
		const error = asLoggableError({ value: 42 });
		expectStack(error);
	});

	it('exposes stack from Error', () => {
		const error = asLoggableError(new Error('stack from Error'));
		expectStack(error);
	});

	it('makes Error.cause loggable', () => {
		const error = asLoggableError(new Error('The Error', { cause: new Error('The Cause') }));
		assertOwn(error, 'cause');
		expectStack(error.cause);
	});

	it('makes error cause loggable', () => {
		const error = asLoggableError({ cause: new Error('The Cause') });
		assertOwn(error, 'cause');
		expectStack(error.cause);
	});

	it('makes any cause loggable', () => {
		const error = asLoggableError({ cause: 'it went wrong' });
		assertOwn(error, 'cause');
		expect(error.cause).toEqual({ message: 'it went wrong' });
	});

	it('lifts message from cause if missing in parent', () => {
		const cause = new Error('What caused this?');
		const error = asLoggableError({ cause });
		assertOwn(error, 'message');
		expect(error.message).toEqual(cause.message);
	});

	it('lifts message from cause if missing in parent', () => {
		const error = asLoggableError({ cause: 42 });
		assertOwn(error, 'message');
		expect(error.message).toEqual(42);
	});
	it('lifts message from cause if missing in parent', () => {
		const error = asLoggableError({ message: null, cause: { message: 'cause' } });
		assertOwn(error, 'message');
		expect(error.message).toEqual('cause');
	});

	it('calls toJSON if available', () => {
		const error = asLoggableError({
			toJSON() {
				return { message: 'hello json world' };
			},
		});
		expect(error).toMatchObject({
			message: 'hello json world',
		});
	});

	it('doesn´t modify input', () => {
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
