import koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import { createHash } from 'crypto';
import { delay } from '@wang-yige/utils';
import { bindMethods } from './methods.js';

const app = new koa();
const router = new Router();

app.use(bodyParser());

bindMethods(router);

let cache = 0;

router.get('/cache', ctx => {
	console.log('url ===> ', ctx.url, ' index ===> ', ++cache);
	ctx.header['content-type'] = 'application/json';
	ctx.body = createHash('md5').update(String(Date.now())).digest('hex');
});

let singleQueue = 0;
router.get('/single/queue', async ctx => {
	console.log('url ===> ', ctx.url, ' index ===> ', ++singleQueue);
	await delay(500);
	ctx.header['content-type'] = 'application/json';
	ctx.body = createHash('md5').update(String(Date.now())).digest('hex');
});

let single = 0;
router.get('/single/delay', async ctx => {
	console.log('url ===> ', ctx.url, ' index ===> ', ++single);
	await delay(2000);
	ctx.header['content-type'] = 'application/json';
	ctx.body = createHash('md5').update(String(Date.now())).digest('hex');
});

let retry = 0;
router.get('/retry', async ctx => {
	const isError = Math.random() > 0.5;
	console.log('url ===> ', ctx.url, ' index ===> ', ++retry, ' error ===> ', isError);
	if (isError) {
		ctx.status = 500;
	}
	ctx.header['content-type'] = 'application/json';
	ctx.body = createHash('md5').update(String(Date.now())).digest('hex');
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(3000, () => {
	console.log('Server is running on http://localhost:3000');
});
