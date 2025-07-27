/// <reference path="../types/index.d.ts" />

const request = $API.APIRequest;
const Root = new request('https://jsonplaceholder.typicode.com');
Root.request.use(
	config => {
		return config;
	},
	err => {
		console.log(err);
	},
);
Root.response.use(
	response => {
		console.log(response);
		return Promise.resolve(response.data);
	},
	err => {
		console.log(err);
		return Promise.reject(err);
	},
);

const api = () => {
	return Root.get(`/error`, {
		retry: true,
	});
};

export async function error() {
	return api();
}
