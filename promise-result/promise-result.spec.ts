import { describe, it, test, expect } from '@jest/globals';
import './promise-result.js'

describe('Promise.result', () => {
    test('success', async () => {
        const [err, result] = await Promise.resolve('success').result();
        expect({ err, result}).toMatchObject({ err: null, result: 'success' });
    });
    test('error', async () => {
        const error = new Error('error');
        const [err, result] = await Promise.reject(error).result();
        expect({ err, result}).toMatchObject({ err: error, result: undefined });
    });
    it('returns Error even when rejection is non error', async () => {
        const [err] = await Promise.reject('error').result();
        console.log(err!.stack);
        expect(err).toBeInstanceOf(Error);
    });
}); 