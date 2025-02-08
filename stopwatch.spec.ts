import { describe, it, test, expect } from '@jest/globals'
import { Timespan } from './stopwatch.js';

describe('Stopwatch', () => {
    test('totalSeconds', () => {
        var ts = new Timespan(1000000000n);

        expect(ts.totalSeconds).toEqual(1.0);
    });
});