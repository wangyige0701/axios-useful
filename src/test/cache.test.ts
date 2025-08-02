import { describe, it, expect } from 'vitest';
import { AxiosRequest } from '@/index';
import { delay } from '@wang-yige/utils';

describe('request by cache', () => {
	const API = new AxiosRequest('http://localhost:3000');

	it('should cache request', async () => {
		const req = () => API.get('/cache', { cache: true });
		let cache;
		const result = await req();
		cache = result.data.cache;

		const result2 = await req();
		expect(result2.data.cache).toBe(cache);
	}, 10000);

	it('setting cache time', async () => {
		const req = () => API.get('/cache', { cache: { time: 1000 } });
		let cache;
		const result = await req();
		cache = result.data.cache;
		await delay(2000);

		const result2 = await req();
		expect(result2.data.cache).not.toBe(cache);
	}, 10000);
});
