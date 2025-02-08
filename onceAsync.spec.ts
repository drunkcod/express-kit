import { describe, expect, it } from '@jest/globals';
import { onceAsync } from './index.js';

describe('onceAsync', () => {
	it('invokes target only once', async () => {
		let n = 0;
		const fn = onceAsync(async () => ++n);

		const [first, second] = await Promise.all([fn(), fn()]);
		expect({ first, second }).toMatchObject({ first: 1, second: 1 });
	});
});
