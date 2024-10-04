import type express from 'express'
export * from '@drunkcod/express-async'
export * from './loggable.js'

type AsyncFn<T> = () => Promise<T>;

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

type ExpressServer = ReturnType<express.Application['listen']>;

const closeAsync = (server: ExpressServer) => (new Promise<void>((resolve, reject) => {
    server.close((err) => {
        if(err) reject(err);
        else resolve();
    })
}));

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