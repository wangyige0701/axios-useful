import Router from 'koa-router';
import { koaBody } from 'koa-body';

/**
 * @param {Router<any, {}>} router
 */
export function bindMethods(router) {
	router.get('/api/method/get', ctx => {
		console.log('api/method ===> get');
		ctx.set('content-type', 'application/json');
		ctx.body = 'get';
	});

	router.delete('/api/method/delete', ctx => {
		console.log('api/method ===> delete');
		ctx.set('content-type', 'application/json');
		ctx.body = 'delete';
	});

	router.head('/api/method/head', ctx => {
		console.log('api/method ===> head');
		ctx.status = 200;
		ctx.set('content-type', 'application/json');
		ctx.set('x-method', 'head');
	});

	router.options('/api/method/options', ctx => {
		console.log('api/method ===> options');
		ctx.status = 200;
		ctx.set('content-type', 'application/json');
		ctx.set('x-method', 'options');
		ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
	});

	router.post('/api/method/post', ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> post');
		ctx.body = `post:${data}`;
	});

	router.post('/api/method/postForm', koaBody({ multipart: true }), ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> postForm');
		ctx.body = `postForm:${data}`;
	});

	router.put('/api/method/put', ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> put');
		ctx.body = `put:${data}`;
	});

	router.put('/api/method/putForm', koaBody({ multipart: true }), ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> putForm');
		ctx.body = `putForm:${data}`;
	});

	router.patch('/api/method/patch', ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> patch');
		ctx.body = `patch:${data}`;
	});

	router.patch('/api/method/patchForm', koaBody({ multipart: true }), ctx => {
		const { body } = ctx.request;
		ctx.set('content-type', 'application/json');
		const data = body.data;
		console.log('api/method ===> patchForm');
		ctx.body = `patchForm:${data}`;
	});
}
