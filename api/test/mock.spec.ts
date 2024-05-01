// test/index.spec.ts
import { env, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { Extender } from '@/base/Extender'
import * as defs from './mockdefs'
import { Redis } from '@upstash/redis/cloudflare'

const RedisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
})

const MockClient = new Extender(env, [defs.TestScanMget])

describe('API test', () => {
    it('[Positive] Get All tokens', async () => {
        const result = MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/allActivetoken'),
        })
        const [_, keys] = await RedisClient.scan(0, { match: 'token/*' })
        const list = await RedisClient.mget(keys)
        expect(await result).toMatchObject(list)
    })
})
