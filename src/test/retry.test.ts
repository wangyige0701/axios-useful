import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { AxiosRequest } from '@/index';
import { parseCodeRange } from '@/utils/retry';

describe('request retry', () => {
	describe('parse code range', () => {
		it('only one code with number', () => {
			const isCode = parseCodeRange(404);
			expect(isCode(404)).toBe(true);
			expect(isCode(200)).toBe(false);
		});

		it('only one code with string', () => {
			const isCode = parseCodeRange('404, 500 - 505');
			expect(isCode(404)).toBe(true);
			expect(isCode(500)).toBe(true);
			expect(isCode(505)).toBe(true);
			expect(isCode(502)).toBe(true);
			expect(isCode(506)).toBe(false);
			expect(isCode(200)).toBe(false);
		});

		it('accept string and number for returned function', () => {
			const isCode = parseCodeRange(400);
			expect(isCode(400)).toBe(true);
			expect(isCode('400')).toBe(true);
			expect(isCode(200)).toBe(false);
			expect(isCode('200')).toBe(false);
		});

		it('with array of number', () => {
			const isCode = parseCodeRange([404, 500, 505]);
			expect(isCode(404)).toBe(true);
			expect(isCode(500)).toBe(true);
			expect(isCode(505)).toBe(true);
			expect(isCode(502)).toBe(false);
			expect(isCode(200)).toBe(false);
		});

		it('with object range', () => {
			const isCode = parseCodeRange({ from: 400, to: 499 });
			expect(isCode(400)).toBe(true);
			expect(isCode(404)).toBe(true);
			expect(isCode(499)).toBe(true);
			expect(isCode(500)).toBe(false);
			expect(isCode(200)).toBe(false);
		});

		it('with array of object range', () => {
			const isCode = parseCodeRange([
				{ from: 400, to: 499 },
				{ from: 500, to: 505 },
			]);
			expect(isCode(400)).toBe(true);
			expect(isCode(404)).toBe(true);
			expect(isCode(499)).toBe(true);
			expect(isCode(500)).toBe(true);
			expect(isCode(502)).toBe(true);
			expect(isCode(505)).toBe(true);
			expect(isCode(506)).toBe(false);
			expect(isCode(200)).toBe(false);
		});
	});

	describe('retry', () => {
		function getId() {
			return createHash('md5').update(String(Date.now())).digest('hex');
		}

		const API = new AxiosRequest('http://localhost:3000');

		it('should retry the specified number of times', async () => {
			const res = API.post('/retry', { id: getId(), num: 3, code: 500 }, { retry: { count: 3, delay: 1000 } });
			const time = Date.now();
			const result = await res;
			expect(result.data).toBe(3);
			expect(Date.now() - time).toBeGreaterThanOrEqual(2000);
			expect(Date.now() - time).toBeLessThanOrEqual(4000);
		}, 10000);

		it('delay time between retries', async () => {
			const res = API.post('/retry', { id: getId(), num: 2, code: 500 }, { retry: { count: 1, delay: 3500 } });
			const time = Date.now();
			const result = await res;
			expect(result.data).toBe(2);
			expect(Date.now() - time).toBeGreaterThanOrEqual(3500);
			expect(Date.now() - time).toBeLessThanOrEqual(5500);
		}, 10000);

		it('less than retry count', async () => {
			const res = API.post('/retry', { id: getId(), num: 4, code: 404 }, { retry: { count: 2 } });
			const result = await res.catch(err => {
				return err.response;
			});
			expect(result.status).toBe(404);
			expect(result.data).toBe(3);
		}, 10000);

		it('bad response codes', async () => {
			const res = API.post(
				'/retry',
				{ id: getId(), num: 4, code: 400 },
				{ retry: { count: 10, badResponseCodes: 404 } },
			);
			const time = Date.now();
			const result = await res.catch(err => {
				return err.response;
			});
			expect(result.status).toBe(400);
			expect(result.data).toBe(1);
			expect(Date.now() - time).toBeLessThan(2000);
		}, 10000);

		it('bad request codes', async () => {
			const res = API.post(
				'/retry',
				{ id: getId(), num: 4, code: 500 },
				{ retry: { count: 10, badResponseCodes: 502 } },
			);
			const time = Date.now();
			const result = await res.catch(err => {
				return err.response;
			});
			expect(result.status).toBe(500);
			expect(result.data).toBe(1);
			expect(Date.now() - time).toBeLessThan(2000);
		}, 10000);

		it('retry domains', async () => {
			const res = API.post(
				'/retry',
				{ id: getId(), num: 2, code: 500 },
				{ retry: { domains: ['http://localhost:3001', 'http://localhost:3002'], count: 3 } },
			);
			const time = Date.now();
			const result = await res;
			expect(result.data).toBe(2);
			expect(Date.now() - time).toBeGreaterThanOrEqual(3000);
			expect(Date.now() - time).toBeLessThanOrEqual(5000);
		}, 10000);
	});
});
