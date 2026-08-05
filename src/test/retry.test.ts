import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { AxiosRequest } from '@/index';
import { parseCodeRange } from '@/utils/retry';
import type { RetryCodeRange } from '@/@types';

describe('request retry', () => {
	describe('parse code range', () => {
		const cases: Array<[string, RetryCodeRange, Array<number | string>, Array<number | string>]> = [
			['number', 404, [404], [200]],
			['string with spaces and reversed range', '404, 505 - 500', [404, 500, 502, 505], [200, 506]],
			['string with invalid parts ignored', 'bad, 201, - , 300 - bad', [201, 300], [200, 400]],
			['unordered number array', [505, 500, 501], [500, 501, 505], [502, 200]],
			['object range', { from: 400, to: 499 }, [400, 404, 499], [500, 200]],
			[
				'array of object ranges',
				[
					{ from: 400, to: 499 },
					{ from: 500, to: 505 },
				],
				[400, 404, 499, 500, 502, 505],
				[506, 200],
			],
		];

		it.each(cases)('%s', (_, range, matched, missed) => {
			const isCode = parseCodeRange(range);

			matched.forEach(code => expect(isCode(code)).toBe(true));
			missed.forEach(code => expect(isCode(code)).toBe(false));
		});

		it('accept string and number for returned function', () => {
			const isCode = parseCodeRange(400);
			expect(isCode(400)).toBe(true);
			expect(isCode('400')).toBe(true);
			expect(isCode(200)).toBe(false);
			expect(isCode('200')).toBe(false);
		});

		it('throws for invalid object range', () => {
			expect(() => parseCodeRange({ from: 400 } as any)).toThrow('Invalid retry code range');
			expect(() => parseCodeRange([{ from: 400, to: '499' }] as any)).toThrow('Invalid retry code range');
		});

		it('returns false for empty ranges', () => {
			const isCode = parseCodeRange([]);

			expect(isCode(404)).toBe(false);
			expect(isCode(200)).toBe(false);
		});
	});

	describe('retry', () => {
		const API = new AxiosRequest('http://localhost:3000');
		let idIndex = 0;

		function getId() {
			return createHash('md5').update(`${Date.now()}-${idIndex++}`).digest('hex');
		}

		function retryRequest(num: number, code: number, retry: any) {
			return API.post('/retry', { id: getId(), num, code }, { retry });
		}

		it('should retry the specified number of times', async () => {
			const res = retryRequest(3, 500, { count: 3, delay: 20 });
			const time = Date.now();
			const result = await res;

			expect(result.data).toBe(3);
			expect(Date.now() - time).toBeGreaterThanOrEqual(40);
			expect(Date.now() - time).toBeLessThan(1000);
		}, 10000);

		it('delay time between retries', async () => {
			const res = retryRequest(2, 500, { count: 1, delay: 200 });
			const time = Date.now();
			const result = await res;

			expect(result.data).toBe(2);
			expect(Date.now() - time).toBeGreaterThanOrEqual(200);
			expect(Date.now() - time).toBeLessThan(1000);
		}, 10000);

		it('less than retry count', async () => {
			const res = retryRequest(4, 404, { count: 2, delay: 20 });
			const result = await res.catch(err => {
				return err.response;
			});

			expect(result.status).toBe(404);
			expect(result.data).toBe(3);
		}, 10000);

		it('does not retry bad response status outside badResponseCodes', async () => {
			const res = retryRequest(4, 500, { count: 10, delay: 20, badResponseCodes: 502 });
			const time = Date.now();
			const result = await res.catch(err => {
				return err.response;
			});

			expect(result.status).toBe(500);
			expect(result.data).toBe(1);
			expect(Date.now() - time).toBeLessThan(500);
		}, 10000);

		it('does not retry bad request status outside badRequestCodes', async () => {
			const res = retryRequest(4, 400, { count: 10, delay: 20, badRequestCodes: 401 });
			const time = Date.now();
			const result = await res.catch(err => {
				return err.response;
			});

			expect(result.status).toBe(400);
			expect(result.data).toBe(1);
			expect(Date.now() - time).toBeLessThan(500);
		}, 10000);

		it('coerces retry count to at least one and delay to at least zero', async () => {
			const time = Date.now();
			const result = await retryRequest(2, 500, { count: 0, delay: -1 });

			expect(result.data).toBe(2);
			expect(Date.now() - time).toBeLessThan(500);
		}, 10000);

		it('retry domains', async () => {
			const res = API.post(
				'/retry',
				{ id: getId(), num: 2, code: 500 },
				{ retry: { domains: ['http://localhost:3001', 'http://localhost:3002'], count: 3, delay: 20 } },
			);
			const time = Date.now();
			const result = await res;

			expect(result.data).toBe(2);
			expect(Date.now() - time).toBeGreaterThanOrEqual(60);
			expect(Date.now() - time).toBeLessThan(1000);
		}, 10000);
	});
});
