/** @typedef {import('koa-router')<any, {}>} Router */

const cache = new Map();

/**
 * @param {Router} router
 */
export function bindRetry(router) {
	router.post('/retry', ctx => {
		const { num = 1, id, code = 500 } = ctx.request.body || {};
		ctx.set('content-type', 'application/json');
		if (!id) {
			ctx.status = 400;
			ctx.body = { error: 'id is required' };
			return;
		}
		let index = cache.get(id) || 1;
		console.log('/retry => id: ' + id + ', index: ' + index + ', num: ' + num);
		if (index < num) {
			ctx.body = index;
			ctx.status = code;
			cache.set(id, ++index);
			return;
		}
		cache.delete(id);
		ctx.body = num;
	});
}
