import { describe, it, expect } from 'vitest';
import { axios, AxiosRequest } from '@/index';
import { createPromise } from '@wang-yige/utils';

describe('main features', () => {
	it('exports axios static and create factory overloads', () => {
		const baseURL = 'http://localhost:3000';
		const API = AxiosRequest.create(baseURL, { limitInOneSecond: 0 });
		const APIByConfig = AxiosRequest.create({ baseURL, limitInOneSecond: 0 });

		expect(API.Axios).toBe(axios);
		expect(API.getUri({ url: '/index' })).toBe(`${baseURL}/index`);
		expect(APIByConfig.getUri({ url: '/index' })).toBe(`${baseURL}/index`);
	});

	it('request and response interceptor order', async () => {
		const { promise: firstRequest, resolve: firstRequestResolve } = createPromise<string>();
		const { promise: secondRequest, resolve: secondRequestResolve } = createPromise<string>();
		const { promise: firstResponse, resolve: firstResponseResolve } = createPromise<string>();
		const { promise: secondResponse, resolve: secondResponseResolve } = createPromise<string>();

		let index = 0;
		const API = new AxiosRequest('http://localhost:3000');
		API.interceptors.request.use(val => {
			firstRequestResolve('first request:' + index++);
			return Promise.resolve(val);
		});
		API.interceptors.request.use(val => {
			secondRequestResolve('second request:' + index++);
			return Promise.resolve(val);
		});
		API.interceptors.response.use(val => {
			firstResponseResolve('first response:' + --index);
			return Promise.resolve(val);
		});
		API.interceptors.response.use(val => {
			secondResponseResolve('second response:' + --index);
			return Promise.resolve(val);
		});

		API.get('/index');

		const [req1, req2, res1, res2] = await Promise.all([
			firstRequest,
			secondRequest,
			firstResponse,
			secondResponse,
		]);
		expect(req1).toBe('first request:1');
		expect(req2).toBe('second request:0');
		expect(res1).toBe('first response:1');
		expect(res2).toBe('second response:0');
	}, 10000);

	it('frequency limit', async () => {
		const API = new AxiosRequest('http://localhost:3000', { limitInOneSecond: 2 });
		const req = () => API.get('/index');

		const first = req();
		const second = req();

		expect(req).toThrow(/^The request frequency is over the limit in one second/);
		await Promise.all([first, second]);
	}, 10000);

	it('allows frequency limit to be disabled', async () => {
		const API = new AxiosRequest('http://localhost:3000', { limitInOneSecond: 0 });
		const responses = await Promise.all([API.get('/index'), API.get('/index'), API.get('/index')]);

		expect(responses.every(response => response.data.message === 'Hello World')).toBe(true);
	}, 10000);

	it('maximum requests', async () => {
		const API = new AxiosRequest('http://localhost:3000', { maximumInOneTime: 2 });
		let id = 0;
		const req = () => API.get(`/index/0.2?case=${id++}`);

		const time = Date.now();
		await Promise.all([req(), req(), req(), req(), req()]);

		expect(Date.now() - time).toBeGreaterThanOrEqual(550);
		expect(Date.now() - time).toBeLessThan(1500);
	}, 30000);
});
