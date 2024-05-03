// test/mock.spec.ts
import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { FavoExtend } from '@/example/favoExtend'
import * as defs from './mockdefs'
import { Redis } from '@upstash/redis/cloudflare'
import { JsonObj } from '@/base/availableTypes'

const RedisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
})

const MockClient = new FavoExtend(env, [
    defs.TestGetTokens,
    defs.TestGetUsers,
    defs.TestAddRanking,
    defs.TestShowRanking,
    defs.TestRemoveRanking,
    defs.TestRmRankingAllUser,
    defs.TestAddRankingAllUser,
    defs.TestRedefine,
    defs.TestRedefine2,
    defs.TestValuesToHalf
])

describe('Mock test', () => {
    it('[Positive] POST create mock-user test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/user'),
            input: {
                handle: 'mockuser',
                name: 'MockUser',
                passwd: 'mockpasswd',
            },
        })
        expect(apiResult).toMatchObject({
            result: 'ok',
        })
    })
    it('[Positive] Get All tokens', async () => {
        const apiResult = await MockClient.apiResult({
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
        expect(apiResult).toEqual(expect.arrayContaining(list))
    })
    it('[Positive] Get All users', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/allUsers'),
        })
        const [_, keys] = await RedisClient.scan(0, { match: 'user/*' })
        const keysAvailable: string[] = []
        await Promise.all(
            keys.map(async (key) => {
                const type = (await RedisClient.type(key)) as string
                if (type === 'json') {
                    keysAvailable.push(key)
                }
            }),
        )
        const list = await RedisClient.json.mget<JsonObj[]>(keysAvailable, '$')
        const expected = list.map((value) => {
            if (Array.isArray(value) && value.length === 1) {
                return value[0]
            }
            return value
        })
        expect(apiResult).toEqual(expect.arrayContaining(expected))
    })
    it('[Positive] Add mockuser to rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/addRank'),
            input: {
                handle: 'mockuser',
            },
        })
        const rank = await RedisClient.zrevrank('rank/favo', 'mockuser')
        expect(apiResult).toMatchObject({
            rank: rank,
        })
    })
    it('[Positive] Add testuser to rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/addRank'),
            input: {
                handle: 'testuser',
            },
        })
        const rank = await RedisClient.zrevrank('rank/favo', 'testuser')
        expect(apiResult).toMatchObject({
            rank: rank,
        })
    })
    it('[Positive] See rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/showRank'),
        })
        const rank = await RedisClient.zrange('rank/favo', 0, -1)
        expect(apiResult).toMatchObject({
            ranking: rank,
        })
    })
    it('[Positive] Remove mockuser from rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/rmRank'),
            input: {
                handle: 'mockuser',
            },
        })
        expect(apiResult).toMatchObject({
            result: 'OK',
        })
    })
    it('[Positive] Remove all users to rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/rmRankAlluser'),
        })
        expect(apiResult).toMatchObject({
            result: 'OK',
        })
    })
    it('[Positive] Add all users to rank/favo', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/addRankAlluser'),
        })
        expect(apiResult).toMatchObject({
            result: 'OK',
        })
    })
    it('[Positive] Redefine test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/redefine'),
        })
        expect(apiResult).toMatchObject({
            key1: 'value1',
            key2: 'value2',
        })
    })
    it('[Positive] Redefine with input test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL(
                'https://example.com/redefine2?value1=hoge&value2=fuga&value3=hogefuga',
            ),
        })
        expect(apiResult).toMatchObject({
            value: 'hoge',
            array: expect.arrayContaining(['fuga', 'hogefuga']),
        })
    })
    it('[Positive] numXX function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL(
                'https://example.com/half',
            ),
            input: [10,20,30]
        })
        expect(apiResult).toEqual(30)
    })
})
