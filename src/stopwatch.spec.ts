import { describe, it, test, expect } from '@jest/globals';
import { Timespan } from './stopwatch.js';

describe('Stopwatch', () => {
	test('totalSeconds', () => {
		const ts = new Timespan(1000000000n);
		expect(ts.totalSeconds).toEqual(1.0);
	});
	test('totalMinutes', () => {
		const ts = Timespan.fromSeconds(90);
		expect(ts.totalMinutes).toEqual(1.5);
	});
	test('seconds to ms', () => {
		const ts = Timespan.fromSeconds(1);
		expect(ts.totalMilliseconds).toEqual(1000);
	});
	test('destructuring', () => {
		const ts = Timespan.fromSeconds(62.3);

		const { minutes, seconds, milliseconds } = ts;
		expect({ minutes, seconds, milliseconds }).toEqual({ minutes: 1, seconds: 2, milliseconds: 300 });
	});
	test('toString', () => {
		expect(Timespan.fromMilliseconds(62345).toString()).toEqual('00:01:02.345');
	});
});
