/** @typedef {import('koa-router')<any, {}>} Router */

import { delay } from '@wang-yige/utils';

/**
 * @param {Router} router
 */
export function bindSingle(router) {
	router.get('/single', async ctx => {
		console.log('/single');
		ctx.set('content-type', 'application/json');
		await delay(1000);
		ctx.body = JSON.stringify({ success: true });
	});
}
