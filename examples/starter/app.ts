import express from 'express';
import { asyncHandler, registerShutdown } from '@drunkcod/express-kit';

const PORT = 8080;

(async function startServer() {
	const app = express();

	app.get('/', (req, res) => {
		res.send('hello world');
	});

	// ✅ 500 and error as "expected"
	app.use('/error/plain', (req, res) => {
		throw new Error('Plain error.');
	});

	// ❌ unobserved rejection will kill the process.
	app.use('/error/async', async (req, res) => {
		await Promise.reject(new Error('Async error.'));
	});

	// ✅ the express4 way to do it
	app.use('/error/async-plain', async (req, res, next) => {
		try {
			await Promise.reject(new Error('Async error.'));
		} catch (error) {
			next(error);
		}
	});

	// ✅ using express-kit
	app.use(
		'/error/async-kit',
		asyncHandler(async (req: express.Request, res: express.Response) => {
			await Promise.reject(new Error('Async error.'));
		})
	);

	const server = app.listen(PORT, () => console.log("I'm listening..."));
	// chandle ctrl+c SIGKILL/SIGABRT
	registerShutdown(server, async () => {
		//close and db connections or other event loop keep alives here.
		console.log('bye...');
	});
})().catch(console.error);
