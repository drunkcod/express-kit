import express from 'express';
import { registerShutdown } from '@drunkcod/express-kit';

const PORT = 8080;

(async function startServer() {
	const app = express();

	app.get('/', (req, res) => {
		res.send('hello world');
	});

	const server = app.listen(PORT, () => console.log("I'm listening..."));
	registerShutdown(server, async () => {
		console.log('bye...');
	});
})().catch(console.error);
