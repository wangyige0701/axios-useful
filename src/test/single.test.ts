import { describe, it, expect } from 'vitest';
import { AxiosRequest } from '@/index';

describe('request in single mode', () => {
	const API = new AxiosRequest('http://localhost:3000');

	// `/single` will delay 1s
	it('send one request at the same time by queue', async () => {
		const req = () => API.get('/single', { single: true });
		const current = Date.now();
		req();
		req();
		req();
		req();
		await req();
		expect(Date.now() - current).toBeGreaterThanOrEqual(5000);
	}, 10000);

	it('send all request at the same time', async () => {
		const req = () => API.get('/single', { single: false });
		const current = Date.now();
		req();
		req();
		req();
		req();
		await req();
		expect(Date.now() - current).toBeGreaterThanOrEqual(1000);
		expect(Date.now() - current).toBeLessThanOrEqual(2000);
	}, 10000);

	it('use prev mode', async () => {
		const req = () => API.get('/single', { single: { type: AxiosRequest.Single.PREV } });
		const result = req();
		const nextReq = req().catch(err => {
			return err;
		});
		const res = await result;
		expect(res.data.success).toBe(true);
		const nextRes = await nextReq;
		expect(nextRes.toString()).toBe(
			'CanceledError: This request has been canceled because of the previous request has not been completed.',
		);
	}, 10000);

	it('use next mode', async () => {
		const req = () => API.get('/single', { single: { type: AxiosRequest.Single.NEXT } });
		const prevReq = req().catch(err => {
			return Promise.resolve(err);
		});
		const res = await req();
		expect(res.data.success).toBe(true);
		const prevRes = await prevReq;
		expect(prevRes.toString()).toBe(
			'CanceledError: This request has been canceled because of the next request is come.',
		);
	}, 10000);
});
