export class Stopwatch {
	#startedAt: bigint;

	private constructor() {
		this.#startedAt = process.hrtime.bigint();
	}

	static startNew() {
		return new Stopwatch();
	}

	get elapsed() {
		return new Timespan(process.hrtime.bigint() - this.#startedAt);
	}
}

export class Timespan {
	#value: bigint;

	constructor(value: bigint) {
		this.#value = value;
	}

	get hours() {
		return Number(this.#value / 1000000000n / 60n / 60n);
	}
	get minutes() {
		return Number((this.#value / 1000000000n / 60n) % 60n);
	}

	get seconds() {
		return Number((this.#value / 1000000000n) % 60n);
	}

	get milliseconds() {
		return Number((this.#value / 1000000n) % 1000n);
	}

	static fromSeconds(seconds: number) {
		return new Timespan(BigInt(seconds * 1e9));
	}

	static fromMilliseconds(ms: number) {
		return new Timespan(BigInt(ms * 1e6));
	}

	get totalMinutes() {
		return Number(this.#value) * (1e-9 / 60.0);
	}

	get totalSeconds() {
		return Number(this.#value) * 1e-9;
	}

	get totalMilliseconds() {
		return Number(this.#value) * 1e-6;
	}

	toString() {
		const { hours, minutes, seconds, milliseconds } = this;
		const padz = (x: number) => (x < 10 ? '0' + x : x);
		return `${padz(hours)}:${padz(minutes)}:${padz(seconds)}.${('00' + milliseconds).slice(-3)}`;
	}

	toDuration() {
		return `${this.totalSeconds}s`;
	}
}
