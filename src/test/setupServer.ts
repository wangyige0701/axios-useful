import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';

const SERVER_URL = 'http://localhost:3000';
const retryCache = new Map<string, number>();

function disableLocalProxy() {
	const localHosts = ['localhost', '127.0.0.1', '::1'];
	const current = process.env.NO_PROXY || process.env.no_proxy || '';
	const next = Array.from(new Set([...current.split(',').filter(Boolean), ...localHosts])).join(',');
	process.env.NO_PROXY = next;
	process.env.no_proxy = next;
}

async function isServerReady() {
	try {
		const response = await fetch(`${SERVER_URL}/index`);
		return response.ok;
	} catch {
		return false;
	}
}

function sleep(time: number) {
	return new Promise(resolve => setTimeout(resolve, time));
}

async function waitForServer(child: ChildProcess, getErrorOutput: () => string) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < 10000) {
		if (await isServerReady()) {
			return;
		}
		if (child.exitCode !== null) {
			throw new Error(`Test server exited before it was ready.\n${getErrorOutput()}`);
		}
		await sleep(100);
	}

	child.kill();
	throw new Error(`Timed out waiting for test server at ${SERVER_URL}.\n${getErrorOutput()}`);
}

function send(response: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}) {
	response.writeHead(status, {
		'content-type': 'application/json',
		...headers,
	});
	if (body === undefined) {
		response.end();
		return;
	}
	response.end(typeof body === 'string' ? body : JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
	let body = '';
	for await (const chunk of request) {
		body += chunk;
	}
	return body;
}

async function readData(request: IncomingMessage) {
	const raw = await readBody(request);
	const type = request.headers['content-type'] || '';
	if (type.includes('application/json')) {
		return JSON.parse(raw || '{}').data;
	}
	if (type.includes('multipart/form-data')) {
		return raw.match(/name="data"[\s\S]*?\r?\n\r?\n([\s\S]*?)\r?\n--/)?.[1];
	}
	return new URLSearchParams(raw).get('data');
}

async function readJson(request: IncomingMessage) {
	const raw = await readBody(request);
	return JSON.parse(raw || '{}');
}

function startFallbackServer() {
	const server = http.createServer(async (request, response) => {
		const url = new URL(request.url || '/', SERVER_URL);
		const method = request.method || 'GET';

		if (method === 'GET' && url.pathname === '/index') {
			send(response, 200, { message: 'Hello World' });
			return;
		}
		if (method === 'GET' && /^\/index\/\d+(?:\.\d+)?$/.test(url.pathname)) {
			const time = Number(url.pathname.split('/').at(-1) || 1);
			await sleep(time * 1000);
			send(response, 200, { message: 'Hello World' });
			return;
		}
		if (method === 'GET' && url.pathname === '/cache') {
			const cache = createHash('md5').update(String(Date.now())).digest('hex');
			send(response, 200, { cache });
			return;
		}
		if (method === 'GET' && url.pathname === '/single') {
			await sleep(1000);
			send(response, 200, { success: true });
			return;
		}
		if (url.pathname.startsWith('/api/method/')) {
			const methodName = url.pathname.split('/').at(-1);
			if (method === 'HEAD') {
				send(response, 200, undefined, { 'x-method': 'head' });
				return;
			}
			if (method === 'OPTIONS') {
				send(response, 200, undefined, {
					'x-method': 'options',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
				});
				return;
			}
			if (['POST', 'PUT', 'PATCH'].includes(method)) {
				send(response, 200, `${methodName}:${await readData(request)}`);
				return;
			}
			send(response, 200, methodName);
			return;
		}
		if (method === 'POST' && url.pathname === '/retry') {
			const { num = 1, id, code = 500 } = await readJson(request);
			if (!id) {
				send(response, 400, { error: 'id is required' });
				return;
			}
			const index = retryCache.get(id) || 1;
			if (index < num) {
				retryCache.set(id, index + 1);
				send(response, code, index);
				return;
			}
			retryCache.delete(id);
			send(response, 200, num);
			return;
		}

		send(response, 404, { error: 'Not found' });
	});

	return new Promise<() => Promise<void>>((resolve, reject) => {
		server.once('error', reject);
		server.listen(3000, () => {
			server.off('error', reject);
			resolve(
				() =>
					new Promise(closeResolve => {
						server.close(() => closeResolve());
					}),
			);
		});
	});
}

export default async function setup() {
	disableLocalProxy();

	if (await isServerReady()) {
		return;
	}

	let errorOutput = '';
	const child = spawn(process.execPath, ['app.js'], {
		cwd: path.resolve(process.cwd(), 'server'),
		stdio: ['ignore', 'ignore', 'pipe'],
	});

	child.stderr?.on('data', chunk => {
		errorOutput += chunk.toString();
	});

	try {
		await waitForServer(child, () => errorOutput);
	} catch (error) {
		if (!/Cannot find package 'koa(?:'|-)/.test(errorOutput)) {
			throw error;
		}
		if (child.exitCode === null && !child.killed) {
			child.kill();
		}
		return startFallbackServer();
	}

	return async () => {
		if (child.exitCode !== null || child.killed) {
			return;
		}
		child.kill();
		await new Promise(resolve => child.once('exit', resolve));
	};
}
