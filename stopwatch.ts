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

	static fromSeconds(seconds: number) {
		return new Timespan(BigInt(seconds * 1e9));
	}

	static fromMilliseconds(ms: number) {
		return new Timespan(BigInt(ms * 1e6));
	}

	get totalSeconds() {
		return Number(this.#value) * 1e-9;
	}

	get totalMilliseconds() {
		return Number(this.#value) * 1e-6;
	}
}
