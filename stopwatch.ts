
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

    get totalSeconds() {
        return Number(this.#value) * 1e-9;
    }
}