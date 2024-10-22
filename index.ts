import type express from 'express'
export * from '@drunkcod/express-async'
export * from './loggable.js'

type AsyncFn<T> = () => Promise<T>;
type ExpressServer = ReturnType<express.Application['listen']>;

export type ErrorHandler = (error: Error, request: express.Request, response: express.Response, next: express.NextFunction) => void;

export function onceAsync<T>(fn: AsyncFn<T>): AsyncFn<T> {
    let p: Promise<T>;
    return () => {
        if(p) return p;
        p = fn();
        fn = () => p;
        return p;
    }
}

export function mergeCallsAsync<T>(fn: AsyncFn<T>): AsyncFn<T> {
    let p: Promise<T> | null;
    return async () => {
        if(!p) p = fn();
        try {
            return await p;
        } finally {
            p = null;
        }
    };
}

interface Listener<T> {
    listen(cb: () => void): T;
    listen(port: number, cb:() => void): T
}

export function listenAsync<T>(server: Listener<T>, options?: { port?: number}) {
    return new Promise<T>((resolve, reject) => {
        try {
            if(options?.port) {
                const r = server.listen(options.port, () => resolve(r));
            } else {
                const r = server.listen(() => resolve(r));
            }
        } catch(err) {
            reject(err);
        }
    })
}

export function closeAsync(server: { close: (cb: (error?: Error) => void) => void }) {
    return new Promise<void>((resolve, reject) => {
        server.close((err) => {
            if(err) reject(err);
            else resolve();
        });
    });
}

export function registerShutdown<Server extends ExpressServer = ExpressServer>(
    server: Server, 
    shutdown?: () => Promise<void>) 
{
    const onShutdown = onceAsync(async () => {
        await closeAsync(server);
        if(shutdown) await shutdown();
    });
    process.on('SIGINT', onShutdown);
    process.on('SIGTERM', onShutdown);
}