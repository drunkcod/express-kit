export type LoaderArgs<T, Args = {}> = { [P in keyof T]?: P extends keyof Args ? Args[P] : undefined };
export type LoaderFn<T, Args, Context> = (wanted: LoaderArgs<T, Args>, context: Context) => Partial<T> | Promise<Partial<T>>;

export class ObjectLoader<T, Args = {}, Context = any> {
	readonly context: Context;
	readonly loader: LoaderFn<T, Args, Context>;
	wanted: LoaderArgs<T, Args>;
	loading: Promise<Partial<T>> | null;

	constructor(loader: LoaderFn<T, Args, Context>, context: Context) {
		this.loader = loader;
		this.context = context;
		this.wanted = {};
		this.loading = null;
	}

	async load<K extends keyof T & keyof Args>(key: K, args: (typeof this.wanted)[K]): Promise<T[K]>;
	async load<K extends Exclude<keyof T, keyof Args>>(key: K): Promise<T[K]>;
	async load<K extends keyof T>(key: K, args?: (typeof this.wanted)[K]): Promise<T[K]> {
		if (key in this.wanted) throw new Error(`${String(key)} can only be requested once.`);
		this.wanted[key] = args;
		if (!this.loading) {
			this.loading = new Promise((resolve, reject) => {
				queueMicrotask(async () => {
					try {
						resolve(await Promise.resolve(this.loader(this.wanted, this.context)));
					} catch (e) {
						reject(e);
					} finally {
						this.wanted = {};
						this.loading = null;
					}
				});
			});
		}

		const found = (await this.loading)[key];
		if (found !== undefined) return found;
		else throw new Error(`Loader failed to provide requested field: ${String(key)}`);
	}
}
