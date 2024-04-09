# favoExtend/api

This is favorite api source code.

## Debug

### Setup tools

You need to install `wrangler` for debug.

Install wrangler **environment have X window system(Not works on CLI server!)**

```sh
sudo npm install -g wrangler
```

And setup this repository

```sh
npm install
```

### Create Redis Database

For debug, you need to create Upstash Redis database aside from production deployment.

And get database infomation `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from `REST API` block.

### Prepair Environment value

Create `.dev.vars` from `.dev.vars.template`

If you debugging, "\*" is allowed into `CORS_ALLOW_ORIGIN`.

If not, input your web service url(allow only request from `CORS_ALLOW_ORIGIN`)

### Start local server

Run wrangler local server for debugging

```sh
wrangler dev
```
