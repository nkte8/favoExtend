// test/mock.spec.ts
import { env } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { FavoExtend } from '@/example/favoExtend'
import * as defs from './mockdefs'
import { Redis } from '@upstash/redis/cloudflare'
import { JsonObj } from '@/base/availableTypes'
import { ExtendError } from '@/base/ExtendError'

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
    defs.TestValuesToHalf,
    defs.TestJsonSafeadd,
    defs.TestJsonDel,
    defs.TestNumCompare,
    defs.TestThrowError,
    defs.TestIsSame,
    defs.TestIsSameNotAll,
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
        let cursor: number = 0
        let resultKeys: string[] = []
        do {
            const [ncursor, keys] = await RedisClient.scan(cursor, {
                match: 'token/*',
            })
            resultKeys = resultKeys.concat(keys)
            cursor = ncursor
        } while (cursor !== 0)
        const keysAvailable: string[] = []
        await Promise.all(
            resultKeys.map(async (key) => {
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
        let cursor: number = 0
        let resultKeys: string[] = []
        do {
            const [ncursor, keys] = await RedisClient.scan(cursor, {
                match: 'user/*',
            })
            resultKeys = resultKeys.concat(keys)
            cursor = ncursor
        } while (cursor !== 0)
        const keysAvailable: string[] = []
        await Promise.all(
            resultKeys.map(async (key) => {
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
        const rank = await RedisClient.zrange('rank/favo', 0, -1, { rev: true })
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
            requestUrl: new URL('https://example.com/half'),
            input: [10, 20, 30],
        })
        expect(apiResult).toEqual(30)
    })
    it('[Positive] jsonSafeAdd function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/safeaddDate'),
            input: {
                handle: 'testuser',
            },
        })
        let date: number | number[] | null = await RedisClient.json.get(
            'user/testuser',
            '$.refreshedAt',
        )
        if (date !== null && Array.isArray(date)) {
            date = date[0]
        }
        expect(apiResult).toMatchObject({
            name: 'TestUser',
            refreshedAt: date,
        })
    })
    it('[Positive] jsonDel function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/jsonDel'),
            input: {
                handle: 'testuser',
            },
        })
        expect(apiResult).toMatchObject({
            result: 'OK',
        })
    })
    it('[Positive] numCompare function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/compare?value=20'),
        })
        expect(apiResult).toEqual(true)
    })
    it('[Negative] throwError function test', async () => {
        const apiResult = MockClient.apiResult({
            httpMethod: 'GET',
            requestUrl: new URL('https://example.com/error'),
        })
        expect(() => apiResult).rejects.toThrow(
            new ExtendError({
                name: 'UserError',
                status: 400,
                message: 'User Caused Error',
            }),
        )
    })
    it('[Positive] isSame function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/issame'),
            input: ['hoge', 'hoge', 'hoge'],
        })
        expect(apiResult).toMatchObject(true)
    })
    it('[Negative] isSame function test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/issame'),
            input: ['hoge', 'hoge', 'hoge', 'hoge', 'hogea'],
        })
        expect(apiResult).toMatchObject(false)
    })
    it('[Positive] isSame function with notAll test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/issamenotall'),
            input: ['hoge', 'fuge', 'fuga', 'hoge', 'fugea'],
        })
        expect(apiResult).toMatchObject(true)
    })
    it('[Negative] isSame function with notAll test', async () => {
        const apiResult = await MockClient.apiResult({
            httpMethod: 'POST',
            requestUrl: new URL('https://example.com/issamenotall'),
            input: ['hoge', 'fuge', 'fugera', 'hogefuge', 'fugea'],
        })
        expect(apiResult).toMatchObject(false)
    })
})
