export class IdGenerator {
	readonly #randomPool;
	readonly #poolSize;
	#current;

	constructor(poolSize: number = 256) {
		poolSize = (poolSize + 15) & ~15;
		this.#randomPool = new Uint8Array(poolSize);
		this.#poolSize = poolSize;
		this.#current = 0;
		this.#refill();
	}

	#refill() {
		crypto.getRandomValues(this.#randomPool);
		this.#current = 0;
	}

	newTrace() {
		return this.#next(16);
	}
	newSpan() {
		return this.#next(8);
	}

	#next(n: 8 | 16) {
		const c = this.#poolSize - this.#current;
		if (c < n) this.#refill();
		const r = Buffer.from(this.#randomPool.buffer, this.#current, n).toString('hex');
		this.#current += n;
		return r;
	}
}
