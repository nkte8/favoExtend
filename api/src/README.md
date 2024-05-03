# favoExtend/api/src

## How to define API

This is example API, GET `<your.worker.origin>/favo?id=<string>` will return `{ "count": <redis value(number) from favo/{id}>}`

```ts
export const GetFavo = new Definition(
    // Here is API Definication
    {
        path: '/favo',
        method: 'GET',
        query: z.object({
            id: z.string().regex(idRule),
        }),
        output: { count: '{#0}' },
    },
    // end of API Definication
    // Here is Redis DB Actions
    [
        {
            keyRef: 'favo/{id}',
            functionName: 'getUndefinedAble',
            output: z.number().default(0),
        },
    ],
    // end of Redis DB Actions
)
```

`Definishion` express `API Definication` and `Redis DB Actions`.

About `functionName` of `Redis DB Actions`, You need to set function to each Redis DB Actions.

By default, you cau use these `functionName` below.

| functionName | Description |
| --- | --- |
| del | [upstash DEL wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/generic/del). delete DB value. |
| incr | [upstash INCR wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/string/incr). incriment DB value. |
| incrSum | Get sum of DB values. Input keyRef like `value/*` and return sum. If collected values contain not-number, skip value. |
| mget | [upstash MGET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/string/mget). get DB values as string by Multikeys. if not string, skip value. |
| get | [upstash GET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/string/get). get DB value as string. If value not found, return undefined. |
| getThrowError | [upstash GET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/string/get). get DB value as string. If value not found, throw Error. |
| set | [upstash SET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/string/set). set string value to DB. |
| jsonGet | [upstash JSON.GET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/json/get). get value in json data from DB. if not json, skip value. |
| jsonMget | [upstash JSON.MGET wrapper](https://upstash.com/docs/oss/sdks/py/redis/commands/json/mget). get values to json data from DB by Multikeys. if not json, skip value. |
| jsonSet | [upstash JSON.SET wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/json/set). set value to json data from DB. |
| jsonDel | [upstash JSON.DEL wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/json/del). del value to json data from DB. |
| scan | [upstash SCAN wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/generic/scan). Get keys with key-pattern matched by grob style. If no keys matched, throw Error. |
| scanRegex | Get keys with key-pattern matched by regex pattern match. If no keys matched, throw Error. |
| typeGrep | Pick keys by type from key array. |
| zadd | [upstash ZADD wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zadd), add multi items. |
| zaddSingle | [upstash ZADD wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zadd), add single item. |
| zrem | [upstash ZREM wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zrem), remove multi items. |
| zremSingle | [upstash ZREM wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zrem), remove single item. |
| zrank | [upstash ZRANK wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zrank), return current rank(low-high) of member. |
| zrevrank | [upstash ZREVRANK wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zrevrank), return current rank(high-low) of member. |
| zrange | [upstash ZRANGE wrapper](https://upstash.com/docs/oss/sdks/ts/redis/commands/zset/zrange), return ranking, part of value or all. |

Also you can use methods not control redis.

| functionName | Description |
| --- | --- |
| objectExtract | Merge Arrays to object. ex: `{hoge: ["a","b","c"],fuga: [100,300,500]}` -> `[{hoge: "a", fuga: 100},{hoge: "b", fuga: 300},{hoge: "c", fuga: 500}]` |
| arrayReplace | Replace array item and return replaced array. |
| defineRef | Pass through the ref value. you can re-define output. |
| numSum | Get sum from key list. |
| numAvg | Get average from key list. |

## How to use API

Edit `index.ts`, Create `Extender` Instance, init with env, `@upstash/redis` parameter, and list of your definications(`Definition` class Instances).

like that...

```ts
import { Extender } from '@/base/Extender'
import * as defs from '@/your_apidefs'

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const Client = new Extender(
            {
                UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
                UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
            },
            [
                defs.YourAPIDef1,
                defs.YourAPIDef2,
                defs.YourAPIDef3,
                defs.YourAPIDef4,
            ],
        )

        const response: Response = await Client.createResponse(request, header)
        return response
    },
}
```

`Extender` have `createResponse`, can create Cloudflare Worker response from request and header. You only need define API, list into definication.

## How to extend API

If you need more Redis DB Action to define API, You can extend new Action. See Extend example `FavoExtend.ts`. Create new class extend by `Extender`, use `addMethod` to add your method.

```ts
import { Extender } from '@/base/Extender'
import * as defs from './apidefs'

export class FavoExtend extends Extender {
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        super(env, [
            defs.GetFavo,
            defs.GetUser,
            defs.PostFavoWithAuth,
            defs.PostUserEdit,
            defs.Login,
        ])

        // Register your extend functions
        this.addMethod({
            auth: {
                kind: 'methodOnly',
                function: this.auth,
            },
            generateToken: {
                kind: 'keyOnly',
                function: this.generateToken,
            },
        })
    }
...
```

You can know Extend functions example in file `FavoExtend.ts`. If you need to control Redis, see [Upstash Command Reference](https://upstash.com/docs/oss/sdks/ts/redis/commands/overview).

When you add your function, you need to set `kind` by function input below.

| Your function input                                  | kind value |
| ---------------------------------------------------- | ---------- |
| no input(or only options[^1]) need                   | methodOnly |
| only key of Redis(and options) need                  | keyOnly    |
| keys(and options) need                               | multiKey   |
| key and Json Literal(and options) need               | literal    |
| key and Json Object(and options) need                | object     |
| key and Json Array(and options) need                 | array      |
| key and Json Object/Array/literal(and options) need  | any        |
| only input of Object/Array/literal(and options) need | anyNokey   |

[^1]: options is un managed key-value object. need to control in function.

About FavoExtend, It already contain definitions. So when you call the class from `index.ts`, you can write simply define like below...

```ts
import { FavoExtend } from './example/favoExtend'

...
export default {
    async fetch(request: Request, env: Env): Promise<Response> {

        const Client = new FavoExtend({
            UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
            UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
        })

        const response: Response = await Client.createResponse(request, header)
        return response
    }
}
```

## How to test function

`wrangler dev` is available, see [Debug Guide(README.md)](../README.md)
