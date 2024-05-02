// test/index.spec.ts
import { env } from 'cloudflare:test'
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
        const keysAvailable: string[] = []
        await Promise.all(
            keys.map(async (key) => {
                const type = await RedisClient.type(key)
                if (type === 'string') {
                    keysAvailable.push(key)
                }
            }),
        )
        const list = await RedisClient.mget(keysAvailable)
        expect(await result).toMatchObject(list)
    })
})
