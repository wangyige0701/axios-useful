import { describe, expect, it } from 'vitest';
import { AxiosRequest } from '@/index';

// prettier-ignore
describe('request methods', () => {
	const delayTime = 10000;
	const postData = { data: 'hello' };

	describe('instance methods', () => {
		const API = new AxiosRequest('http://localhost:3000');
		API.interceptors.response.use(val => {
			if (val.headers['x-method']) {
				return Promise.resolve(val.headers['x-method']);
			}
			return Promise.resolve(val.data);
		});
		API.interceptors.request.use(val => {
			return Promise.resolve(val);
		});

		it('get', async () => {
			const res = await API.get('/api/method/get');
			expect(res).toBe('get');
		}, delayTime);

		it('delete', async () => {
			const res = await API.delete('/api/method/delete');
			expect(res).toBe('delete');
		}, delayTime);

		it('head', async () => {
			const res = await API.head('/api/method/head');
			expect(res).toBe('head');
		}, delayTime);

		it('options', async () => {
			const res = await API.options('/api/method/options');
			expect(res).toBe('options');
		}, delayTime);

		it('post', async () => {
			const res = await API.post('/api/method/post', { ...postData });
			expect(res).toBe('post:hello');
		}, delayTime);

		it('postForm', async () => {
			const formData = new FormData();
			formData.append('data', postData.data);
			const formRes = await API.postForm('/api/method/postForm', { ...postData });
			expect(formRes).toBe('postForm:hello');
		}, delayTime);

		it('put', async () => {
			const res = await API.put('/api/method/put', { ...postData });
			expect(res).toBe('put:hello');
		}, delayTime);

		it('putForm', async () => {
			const formRes = await API.putForm('/api/method/putForm', { ...postData });
			expect(formRes).toBe('putForm:hello');
		}, delayTime);

		it('patch', async () => {
			const res = await API.patch('/api/method/patch', { ...postData });
			expect(res).toBe('patch:hello');
		}, delayTime);

		it('patchForm', async () => {
			const formRes = await API.patchForm('/api/method/patchForm', { ...postData });
			expect(formRes).toBe('patchForm:hello');
		}, delayTime);
	});

	describe('static methods', () => {
		const baseUrl = 'http://localhost:3000/api/method'
		function response(resp: any) {
			if (resp.headers['x-method']) {
				return resp.headers['x-method'];
			}
			return resp.data;
		}

		it('get', async () => {
			const resp = await AxiosRequest.get(baseUrl + '/get')
			const result = response(resp);
			expect(result).toBe('get');
		}, delayTime)

		it('delete', async () => {
			const resp = await AxiosRequest.delete(baseUrl + '/delete');
			const result = response(resp);
			expect(result).toBe('delete');
		}, delayTime);

		it('head', async () => {
			const resp = await AxiosRequest.head(baseUrl + '/head');
			const result = response(resp);
			expect(result).toBe('head');
		}, delayTime);

		it('options', async () => {
			const resp = await AxiosRequest.options(baseUrl + '/options');
			const result = response(resp);
			expect(result).toBe('options');
		}, delayTime);

		it('post', async () => {
			const resp = await AxiosRequest.post(baseUrl + '/post', { ...postData });
			const result = response(resp);
			expect(result).toBe('post:hello');
		}, delayTime);

		it('postForm', async () => {
			const resp = await AxiosRequest.postForm(baseUrl + '/postForm', { ...postData });
			const result = response(resp);
			expect(result).toBe('postForm:hello');
		}, delayTime);

		it('put', async () => {
			const resp = await AxiosRequest.put(baseUrl + '/put', { ...postData });
			const result = response(resp);
			expect(result).toBe('put:hello');
		}, delayTime);

		it('putForm', async () => {
			const resp = await AxiosRequest.putForm(baseUrl + '/putForm', { ...postData });
			const result = response(resp);
			expect(result).toBe('putForm:hello');
		}, delayTime);

		it('patch', async () => {
			const resp = await AxiosRequest.patch(baseUrl + '/patch', { ...postData });
			const result = response(resp);
			expect(result).toBe('patch:hello');
		}, delayTime);

		it('patchForm', async () => {
			const resp = await AxiosRequest.patchForm(baseUrl + '/patchForm', { ...postData });
			const result = response(resp);
			expect(result).toBe('patchForm:hello');
		}, delayTime);
	});
});
