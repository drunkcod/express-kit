import type express from 'express';
import { describe, test, expect } from '@jest/globals';
import type { ErrorHandler } from './index.js';

function errorHandler(fn: ErrorHandler, name?: string): ErrorHandler {
	if (fn.length === 4 && !name) return fn;
	name ??= fn.name;
	return {
		[name](error: Error, request: express.Request, response: express.Response, next: express.NextFunction) {
			return fn(error, request, response, next);
		},
	}[name];
}

describe('errorHandler', () => {
	test('error param only', () => {
		expect(errorHandler((error: Error) => {}).length).toEqual(4);
	});

	test('preserves name', () => {
		expect(errorHandler(function myErrorHandler(error: Error) {}).name).toEqual('myErrorHandler');
	});

	test('can name error handle', () => {
		expect(errorHandler((error: Error) => {}, 'onError').name).toEqual('onError');
	});

	test("doesn't wrap needlessly", () => {
		const onError = (error: Error, request: express.Request, respose: express.Response, next: express.NextFunction) => {};
		expect(errorHandler(onError)).toStrictEqual(onError);
	});
});
