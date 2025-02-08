import { describe, expect, it } from '@jest/globals';
import { mergeCallsAsync } from './index.js';

describe('mergeCallsAsync', () => {
	it('invokes target once for shared entrants', async () => {
		let resolve: ((x: number) => void)[] = [];
		const fn = mergeCallsAsync(
			() =>
				new Promise<number>((r, reject) => {
					resolve.push(r);
				})
		);
		const waitTwo = Promise.all([fn(), fn()]);
		resolve.forEach((fn, x) => fn(1 + x));
		const [first, second] = await waitTwo;
		expect({ first, second }).toMatchObject({ first: 1, second: 1 });
	});

	it('alows new invocation after completion', async () => {
		let resolve: ((x: number) => void)[] = [];
		const fn = mergeCallsAsync(
			() =>
				new Promise<number>((r, reject) => {
					resolve.push(r);
				})
		);

		const first = fn();
		resolve.forEach((fn) => fn(1));
		resolve.length = 0;
		const firstResult = await first;

		const second = fn();
		resolve.forEach((fn) => fn(2));

		expect({ first: firstResult, second: await second }).toMatchObject({ first: 1, second: 2 });
	});

	it('retries after error', async () => {
		let n = 0;
		const fn = mergeCallsAsync(async () => {
			if (++n == 1) throw new Error('Error!');
			return n;
		});

		await expect(async () => await fn()).rejects.toThrow();
		expect({ second: await fn() }).toMatchObject({ second: 2 });
	});
});
