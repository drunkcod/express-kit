import { describe, it, test, expect } from '@jest/globals';
import { AsyncBinder, asyncHandler, boundAsyncHandler } from './index.js';
import express from 'express';

describe('asyncHandler', () => {
	it('adds next arg for simple handler', () => {
		const handler = async (req: express.Request, res: express.Response) => {};
		const it = asyncHandler(handler);
		expect(it.length).toEqual(3);
	});

	it('supports error handler', () => {
		const handler = async (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {};
		const it = asyncHandler(handler);
		expect(it.length).toEqual(4);
	});

	test('inferrence', () => {
		const handler = asyncHandler(async (req, res) => {});
		const error = asyncHandler(async (error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {});
	});

	it('supports custom handler', async () => {
		const handler = async (req: express.Request & { value: number }, res: express.Response) => req.value;
		const it = asyncHandler(handler);
		expect(it.length).toEqual(3);
		const any = { value: 42 } as any;
		expect(await it(any, any, any)).toEqual(any.value);
	});

	it('catches non async promise problems', async () => {
		const any = {} as any;
		const handler = (req: express.Request, res: express.Response): Promise<void> => {
			throw new Error();
		};

		const it = asyncHandler(handler);
		let caughtError = null;
		await it(any, any, (error) => {
			caughtError = error;
		});

		expect(caughtError).not.toBeNull();
	});
});

class MyController {
	value: object | number | undefined;

	async getValue(req: express.Request, res: express.Response) {
		return this.value;
	}

	async getT(req: express.Request<{ value: number }>, res: express.Response, next: express.NextFunction) {
		return req.params.value;
	}

	async getCustom(req: express.Request & { value: number }, res: express.Response, next: express.NextFunction) {
		return req.value;
	}

	async onError(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
		return err;
	}
}

describe('boundAsyncHandler', () => {
	it('binds to instance', async () => {
		const controller = new MyController();
		controller.value = 42;
		const it = boundAsyncHandler(controller, 'getValue');
		const any = {} as any;
		expect(it.length).toEqual(3);
		expect(await it(any, any, any)).toEqual(controller.value);
	});

	it('supports typed requests', async () => {
		const controller = new MyController();
		const it = boundAsyncHandler(controller, 'getT');
		const any = { params: { value: 42 } } as any;
		expect(it.length).toEqual(3);
		expect(await it(any, any, any)).toEqual(any.params.value);
	});

	it('supports extended requests', async () => {
		const controller = new MyController();
		const it = boundAsyncHandler(controller, 'getCustom');
		const any = { value: 42 } as any;
		expect(it.length).toEqual(3);
		expect(await it(any, any, any)).toEqual(any.value);
	});

	it('supports error handler', async () => {
		const controller = new MyController();
		const it = boundAsyncHandler(controller, 'onError');
		const any = {} as any;
		const error = new Error();
		expect(it.length).toEqual(4);
		expect(await it(error, any, any, any)).toEqual(error);
	});

	interface CustomRequest extends express.Request {
		customValue: any;
	}

	class CustomRequestController {
		async getValue(req: CustomRequest, res: express.Response) {
			return req.customValue;
		}
	}

	it('supports custom request types', async () => {
		const controller = new CustomRequestController();
		const it = boundAsyncHandler(controller, 'getValue');
		const any = { customValue: 'custom-value' } as any;
		expect(it.length).toEqual(3);
		expect(await it(any, any, any)).toEqual(any.customValue);
	});
});

describe('AsyncBinder', () => {
	const controller = new MyController();
	controller.value = 42;
	const binder = new AsyncBinder(controller);

	it('binds to instance', async () => {
		const it = binder.bind('getValue');
		const any = {} as any;
		expect(it.length).toEqual(3);
		expect(await it(any, any, any)).toEqual(controller.value);
	});

	it('supports error handler', async () => {
		const it = binder.bind('onError');
		const any = {} as any;
		const error = new Error();
		expect(it.length).toEqual(4);
		expect(await it(error, any, any, any)).toEqual(error);
	});
});
