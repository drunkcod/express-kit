import { describe, it, expect } from '@jest/globals';
import { asyncHandler, boundAsyncHandler } from './index'
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
        }

        const it = asyncHandler(handler);
        let caughtError = null;
        await it(any, any, (error) => { caughtError = error;});

        expect(caughtError).not.toBeNull();
    })

});

describe('boundAsyncHandler', () => {
    class MyController {
        value: object | number | undefined;

        async getValue(req: express.Request, res: express.Response) {
            return this.value;
        }

        async getT(req: express.Request<{value: number}>, res: express.Response, next: express.NextFunction) {
            return req.params.value;
        }

        async getCustom(req: express.Request & {value: number}, res: express.Response, next: express.NextFunction) {
            return req.value;
        }

        async onError(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
            return err;
        }
    }

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
        const any = { } as any;
        const error = new Error();
        expect(it.length).toEqual(4);
        expect(await it(error, any, any, any)).toEqual(error);
    });

});