import { describe, it, expect, vi } from 'vitest';
import { AxiosRequest } from '@/index';
import { delay } from '@wang-yige/utils';
import type { Cache } from '@/@types';

describe('request by cache', () => {
	const BASE_URL = 'http://localhost:3000';
	let id = 0;

	function createAPI() {
		return new AxiosRequest(BASE_URL);
	}

	function cacheUrl(name: string) {
		return `/cache?case=${name}-${Date.now()}-${id++}`;
	}

	async function requestCache(api: InstanceType<typeof AxiosRequest>, url: string, cache: true | Cache) {
		const result = await api.get<{ cache: string }>(url, { cache });
		return result.data.cache;
	}

	it('should cache request', async () => {
		const api = createAPI();
		const url = cacheUrl('basic');
		const cache = await requestCache(api, url, true);

		const result = await requestCache(api, url, true);
		expect(result).toBe(cache);
	}, 10000);

	it('setting cache time', async () => {
		const api = createAPI();
		const url = cacheUrl('expire');
		const cache = await requestCache(api, url, { time: 20 });
		await delay(50);

		const result = await requestCache(api, url, { time: 20 });
		expect(result).not.toBe(cache);
	}, 10000);

	describe('validate', () => {
		it('caches the response when validate allows it', async () => {
			const api = createAPI();
			const url = cacheUrl('validate-true');
			const validate = vi.fn(response => response.status === 200 && typeof response.data.cache === 'string');

			const cache = await requestCache(api, url, { validate });
			const result = await requestCache(api, url, { validate });

			expect(result).toBe(cache);
			expect(validate).toHaveBeenCalledTimes(1);
			expect(validate.mock.calls[0][0].config.url).toBe(url);
		}, 10000);

		it('does not cache the response when validate returns false', async () => {
			const api = createAPI();
			const url = cacheUrl('validate-false');
			const validate = vi.fn(() => false);

			const first = await requestCache(api, url, { validate });
			await delay(5);
			const second = await requestCache(api, url, { validate });

			expect(second).not.toBe(first);
			expect(validate).toHaveBeenCalledTimes(2);
		}, 10000);

		it('only treats strict false as a rejected validation result', async () => {
			const api = createAPI();
			const url = cacheUrl('validate-non-false');
			const validate = vi.fn(() => undefined) as unknown as Cache['validate'];

			const cache = await requestCache(api, url, { validate });
			const result = await requestCache(api, url, { validate });

			expect(result).toBe(cache);
			expect(validate).toHaveBeenCalledTimes(1);
		}, 10000);
	});

	describe('cacheHit', () => {
		it('uses cached response when cacheHit allows it', async () => {
			const api = createAPI();
			const url = cacheUrl('cache-hit-true');
			const cacheHit = vi.fn(config => config.url === url);

			const cache = await requestCache(api, url, { cacheHit });
			const result = await requestCache(api, url, { cacheHit });

			expect(result).toBe(cache);
			expect(cacheHit).toHaveBeenCalledTimes(1);
			expect(cacheHit.mock.calls[0][0].url).toBe(url);
		}, 10000);

		it('bypasses cached response when cacheHit returns false', async () => {
			const api = createAPI();
			const url = cacheUrl('cache-hit-false');
			const cache = await requestCache(api, url, true);
			const cacheHit = vi.fn(() => false);

			await delay(5);
			const bypassed = await requestCache(api, url, { cacheHit });
			const cachedAgain = await requestCache(api, url, true);

			expect(bypassed).not.toBe(cache);
			expect(cachedAgain).toBe(cache);
			expect(cacheHit).toHaveBeenCalledTimes(1);
		}, 10000);

		it('only treats strict false as a cache miss result', async () => {
			const api = createAPI();
			const url = cacheUrl('cache-hit-non-false');
			const cacheHit = vi.fn(() => undefined) as unknown as Cache['cacheHit'];

			const cache = await requestCache(api, url, { cacheHit });
			const result = await requestCache(api, url, { cacheHit });

			expect(result).toBe(cache);
			expect(cacheHit).toHaveBeenCalledTimes(1);
		}, 10000);

		it('does not call cacheHit before the first cache entry or after expiration', async () => {
			const api = createAPI();
			const firstUrl = cacheUrl('cache-hit-empty');
			const expiredUrl = cacheUrl('cache-hit-expired');
			const emptyCacheHit = vi.fn(() => true);
			const expiredCacheHit = vi.fn(() => false);

			await requestCache(api, firstUrl, { cacheHit: emptyCacheHit });
			const cache = await requestCache(api, expiredUrl, { time: 20, cacheHit: expiredCacheHit });
			await delay(50);
			const result = await requestCache(api, expiredUrl, { time: 20, cacheHit: expiredCacheHit });

			expect(result).not.toBe(cache);
			expect(emptyCacheHit).not.toHaveBeenCalled();
			expect(expiredCacheHit).not.toHaveBeenCalled();
		}, 10000);
	});
});
