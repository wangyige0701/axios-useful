import { describe, expect, it } from 'vitest';
import { AxiosRequest } from '@/index';

describe('Request Methods', () => {
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

	const postData = { data: 'hello' };

	it('get', async () => {
		const res = await API.get('/api/method/get');
		expect(res).toBe('get');
	}, 10000);

	it('delete', async () => {
		const res = await API.delete('/api/method/delete');
		expect(res).toBe('delete');
	}, 10000);

	it('head', async () => {
		const res = await API.head('/api/method/head');
		expect(res).toBe('head');
	}, 10000);

	it('options', async () => {
		const res = await API.options('/api/method/options');
		expect(res).toBe('options');
	}, 10000);

	it('post', async () => {
		const res = await API.post('/api/method/post', { ...postData });
		expect(res).toBe('post:hello');
	}, 10000);

	it('postForm', async () => {
		const formData = new FormData();
		formData.append('data', postData.data);
		const formRes = await API.postForm('/api/method/postForm', { ...postData });
		expect(formRes).toBe('postForm:hello');
	}, 10000);

	it('put', async () => {
		const res = await API.put('/api/method/put', { ...postData });
		expect(res).toBe('put:hello');
	}, 10000);

	it('putForm', async () => {
		const formRes = await API.putForm('/api/method/putForm', { ...postData });
		expect(formRes).toBe('putForm:hello');
	}, 10000);

	it('patch', async () => {
		const res = await API.patch('/api/method/patch', { ...postData });
		expect(res).toBe('patch:hello');
	}, 10000);

	it('patchForm', async () => {
		const formRes = await API.patchForm('/api/method/patchForm', { ...postData });
		expect(formRes).toBe('patchForm:hello');
	}, 10000);
});
