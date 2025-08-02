/** @typedef {import('koa-router')<any, {}>} Router */

import { createHash } from 'crypto';

/**
 * @param {Router} router
 */
export function bindCache(router) {
	router.get('/cache', ctx => {
		const cache = createHash('md5').update(String(Date.now())).digest('hex');
		console.log('/cache => ' + cache);
		ctx.set('content-type', 'application/json');
		ctx.body = JSON.stringify({ cache });
	});
}
