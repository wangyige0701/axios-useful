import { describe, expect, it } from 'vitest';
import { AxiosRequest } from '@/index';

describe('request methods', () => {
	const delayTime = 10000;
	const postData = { data: 'hello' };
	const noDataCases = [
		['get', 'get'],
		['delete', 'delete'],
		['head', 'head'],
		['options', 'options'],
	] as const;
	const withDataCases = [
		['post', 'post:hello'],
		['postForm', 'postForm:hello'],
		['put', 'put:hello'],
		['putForm', 'putForm:hello'],
		['patch', 'patch:hello'],
		['patchForm', 'patchForm:hello'],
	] as const;

	function response(resp: any) {
		if (resp.headers['x-method']) {
			return resp.headers['x-method'];
		}
		return resp.data;
	}

	describe('instance methods', () => {
		const API = new AxiosRequest('http://localhost:3000');

		API.interceptors.response.use(val => Promise.resolve(response(val)));
		API.interceptors.request.use(val => Promise.resolve(val));

		it.each(noDataCases)('%s', async (method, expected) => {
			const res = await API[method](`/api/method/${method}`);
			expect(res).toBe(expected);
		}, delayTime);

		it.each(withDataCases)('%s', async (method, expected) => {
			const res = await API[method](`/api/method/${method}`, { ...postData });
			expect(res).toBe(expected);
		}, delayTime);
	});

	describe('static methods', () => {
		const baseUrl = 'http://localhost:3000/api/method';

		it.each(noDataCases)('%s', async (method, expected) => {
			const resp = await AxiosRequest[method](`${baseUrl}/${method}`);
			expect(response(resp)).toBe(expected);
		}, delayTime);

		it.each(withDataCases)('%s', async (method, expected) => {
			const resp = await AxiosRequest[method](`${baseUrl}/${method}`, { ...postData });
			expect(response(resp)).toBe(expected);
		}, delayTime);
	});
});
