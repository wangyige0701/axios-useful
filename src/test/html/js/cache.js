/// <reference path="../types/index.d.ts" />

const request = $API.APIRequest;
const Root = new request('https://jsonplaceholder.typicode.com', {
	maximum: 1,
});
Root.response.use(response => {
	return Promise.resolve(response.data);
});

const api = i => {
	return Root.get(`/todos/1`, {
		cache: true,
	});
};

export async function cache(i) {
	const result = [];
	for (let j = 0; j < i; j++) {
		const resp = api(j + 1);
		result.push(resp);
	}
	return Promise.all(result);
}
