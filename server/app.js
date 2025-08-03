import koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { bindMethods } from './methods.js';
import { bindCache } from './cache.js';
import { bindSingle } from './single.js';
import { delay } from '@wang-yige/utils';
import { bindRetry } from './retry.js';

const app = new koa();
const router = new Router();

app.use(bodyParser());

bindMethods(router);

bindCache(router);

bindSingle(router);

bindRetry(router);

router.get('/index', ctx => {
	console.log('/index');
	ctx.set('Content-Type', 'application/json');
	ctx.body = { message: 'Hello World' };
});

router.get('/index/:time', async ctx => {
	const { time = 1 } = ctx.params;
	console.log('/index/' + time);
	await delay(time * 1000);
	ctx.set('Content-Type', 'application/json');
	ctx.body = { message: 'Hello World' };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});
