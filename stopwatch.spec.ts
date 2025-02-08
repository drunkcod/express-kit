import { describe, it, test, expect } from '@jest/globals';
import { Timespan } from './stopwatch.js';

describe('Stopwatch', () => {
	test('totalSeconds', () => {
		const ts = new Timespan(1000000000n);

		expect(ts.totalSeconds).toEqual(1.0);
	});
	test('seconds to ms', () => {
		const ts = Timespan.fromSeconds(1);
		expect(ts.totalMilliseconds).toEqual(1000);
	});
});
