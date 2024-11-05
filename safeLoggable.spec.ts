import { describe, it, test, expect } from '@jest/globals'
import { hasOwnJSON } from 'loggable.js';

const makeSafe = (value: unknown): unknown => {
    if(value == null || typeof value !== 'object') return value;

    const ctx = new Map<unknown, { depth: number; path: string; }>();
    ctx.set(value, { depth: 0, path: '$' });
    const next = <T extends object>(value: T, n: number, root: string): { modified: false; result: T } | { modified: true; result: unknown } => {
        if(Array.isArray(value)) return onArray(value, n, root);
        if(hasOwnJSON(value)) return { modified: true, result: value.toJSON() };

        const found = ctx.get(value);
        if(found != undefined && found.depth < n) return { modified: true, result: `[${found.path}]` };
        const m = n + 1;
        const ex = Object.entries(value).map(([key, x]) => {
            const isObject = x != null && typeof x === 'object';
            if(isObject && !ctx.has(x))
                ctx.set(x, { depth: m, path: `${root}.${key}` });
            return [key, isObject, x];
        });
        const es: [string, unknown][] = [];
        let wasModified = false;
        ex.forEach(([key, isObject, value]) => {
            if(!isObject) {
                es.push([key, value]);
            } else {
                const { modified, result } = next(value, m, `${root}.${key}`);
                wasModified ||= modified;
                es.push([key, result]);
            }
        });
        ctx.delete(value);
        return wasModified ? { modified: true, result: Object.fromEntries(es) } : { modified: false, result: value };
    };
    const onArray = <T extends unknown[]>(value: T, n: number, root: string): { modified: false; result: T } | { modified: true; result: unknown[] } => {
        const m = n + 1;
        let modified = false;
        const result: unknown[] = [];
        value.forEach((x, i) => {
            const isObject = x != null && typeof x === 'object';
            if(!isObject) return x;
            const path = `${root}[${i}]`;
            if(!ctx.has(x))
                ctx.set(x, { depth: m, path });
            const r = next(x, m, path);
            modified ||= r.modified;
            result.push(r.result);
        });
        return modified ? { modified: true, result } : { modified: false, result: value };
    };
    const {modified, result } =  next(value, 0, '$');
    return modified ? result : value;
}

describe('makeSafe', () => {
    test('replaces circular depency with [Circular]', () => {
        const obj : Record<string, unknown> = {
            id: 'a',
        };
        obj['next'] = obj;

        expect(makeSafe(obj)).toMatchObject({
            id: 'a',
            next: '[$]'
        });
    });
    test('duplicates are ok', () => {
        const obj : Record<string, unknown> = {
            id: 'a',
        };

        expect(makeSafe({ a: obj, aa: { a: obj } })).toMatchObject({
            a: { id: 'a' },
            aa: { a: { id: 'a' } },
        });
    });
    test('branch ref', () => {
        const b : Record<string, unknown> = {
            id: 'b',
        };
        b['next'] = b;
        const obj : Record<string, unknown> = {
            id: 'a',
            b,
            c: { id: 'c', b }
        };
        expect(makeSafe(obj)).toMatchObject({
            id: 'a',
            b: { id: 'b', next: '[$.b]' },
            c: { id: 'c', b: { id: 'b', next: '[$.c.b]' } },
        });
    });
    test('array item', () => {
        const a : Record<string, unknown> = {
            id: 'a',
        };
        a['next'] = a;
        expect(makeSafe({ it: [a, [a]] })).toMatchObject({ it: [
            { id: 'a', next:'[$.it[0]]' }, 
            [ { id: 'a', next:'[$.it[1][0]]' } ] 
        ]});
    });
    test('values', () => {
        const values = {
            undefined: undefined,
            null: null,
            number: 42,
            string: 'hello world',
            array: [1, true, null],
            bool: false,
        };
        expect(makeSafe(values)).toMatchObject(values);
    });
    test("toJSON()", () => {
        expect(makeSafe({ toJSON() {
            return { message: 'hello'}
        }})).toMatchObject({ message: 'hello'});
    });
});
