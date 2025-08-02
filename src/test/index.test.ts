import { describe, it, expect } from 'vitest';
import { axios, AxiosRequest } from '@/index';
import { createPromise } from '@wang-yige/utils';

describe('main features', () => {
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

		try {
			req();
			req();
			req();
		} catch (error: any) {
			expect(error).toBeInstanceOf(Error);
			expect(error.message).toMatch(/^The request frequency is over the limit in one second/);
		}
	}, 10000);

	it('maximum requests', async () => {
		const API = new AxiosRequest('http://localhost:3000', { maximumInOneTime: 2 });
		const req = (time: number) => API.get('/index/' + time);

		const time = Date.now();
		req(1);
		req(2);
		req(3);
		req(4);
		const res = await req(5);

		expect(Date.now() - time).toBeGreaterThanOrEqual(9000);
		expect(Date.now() - time).toBeLessThanOrEqual(10000);
	}, 30000);
});
