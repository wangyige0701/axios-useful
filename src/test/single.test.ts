import { describe, it, expect } from 'vitest';
import { AxiosRequest } from '@/index';

describe('request in single mode', () => {
	let id = 0;

	function createAPI() {
		return new AxiosRequest('http://localhost:3000');
	}

	function singleUrl(name: string) {
		return `/single?case=${name}-${id++}`;
	}

	// `/single` will delay 1s
	it('send one request at the same time by queue', async () => {
		const API = createAPI();
		const url = singleUrl('queue');
		const req = () => API.get(url, { single: true });
		const current = Date.now();
		await Promise.all([req(), req()]);

		expect(Date.now() - current).toBeGreaterThanOrEqual(2000);
	}, 10000);

	it('uses queue mode by default', async () => {
		const API = createAPI();
		const url = singleUrl('default-queue');
		const current = Date.now();

		await Promise.all([API.get(url), API.get(url)]);

		expect(Date.now() - current).toBeGreaterThanOrEqual(2000);
	}, 10000);

	it('send all request at the same time', async () => {
		const API = createAPI();
		const url = singleUrl('off');
		const req = () => API.get(url, { single: false });
		const current = Date.now();
		await Promise.all([req(), req()]);

		expect(Date.now() - current).toBeGreaterThanOrEqual(1000);
		expect(Date.now() - current).toBeLessThanOrEqual(2000);
	}, 10000);

	it('use prev mode', async () => {
		const API = createAPI();
		const url = singleUrl('prev');
		const req = () => API.get(url, { single: { type: AxiosRequest.Single.PREV } });
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
		const API = createAPI();
		const url = singleUrl('next');
		const req = () => API.get(url, { single: { type: AxiosRequest.Single.NEXT } });
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

	it('throws for unknown single type', () => {
		const API = createAPI();

		expect(() => API.get(singleUrl('unknown'), { single: { type: 'unknown' as any } })).toThrow(
			'Unknown single type',
		);
	});
});
