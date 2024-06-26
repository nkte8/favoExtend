// test/index.spec.ts
import { env, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import worker from '@/index'
import { Redis } from '@upstash/redis/cloudflare'

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

const RedisClient = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
})
describe('API test', () => {
    // unit style
    it('[Negative] Access direct test', async () => {
        const request = new Request('https://example.com', { method: 'GET' })
        const response = await worker.fetch(request, env)
        expect(await response.json()).toMatchObject({
            error: 'Invalid Request',
            message: 'Invalid Content-type Request received',
        })
    })
    // integration style
    it('[Negative] GET user not exist test', async () => {
        const response = await SELF.fetch(
            'https://example.com/user?handle=notexist',
            {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                },
            },
        )
        const apiResult = await response.json()
        expect(apiResult).toMatchObject({
            error: 'Not Found',
            message: 'Data not found error',
        })
    })
    it('[Negative] GET invalid id test', async () => {
        const response = await SELF.fetch('https://example.com/favo?id=test', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
            },
        })
        const apiResult = await response.json()
        expect(apiResult).toMatchObject({
            error: 'Invalid Request',
            message: 'Request coitains invalid inputs',
        })
    })
    it('[Negative] GET favo not exist test', async () => {
        const response = await SELF.fetch(
            'https://example.com/favo?id=no-id-defined',
            {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                },
            },
        )
        const apiResult = await response.json()
        // get value. default is 0
        const count = await RedisClient.get('favo/no-id-defined').then((value) =>
            value === null ? 0 : value,
        )
        expect(apiResult).toMatchObject({
            count: count,
        })
    })
    it('[Negative] POST create invalid user test', async () => {
        const response = await SELF.fetch('https://example.com/user', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                handle: '0usr',
                name: 'InvalidUser',
                passwd: 'testpasswd',
            }),
        })
        const apiResult = await response.json()
        expect(apiResult).toMatchObject({
            error: 'Invalid Request',
            message: 'Request coitains invalid inputs',
        })
    })

    it('[Positive] POST create user test', async () => {
        const response = await SELF.fetch('https://example.com/user', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                handle: 'testuser',
                name: 'TestUser',
                passwd: 'testpasswd',
            }),
        })
        const apiResult = await response.json()
        expect(apiResult).toMatchObject({
            result: 'ok',
        })
    })
    it('[Positive] Generate token', async () => {
        const response = await SELF.fetch('https://example.com/login', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                handle: 'testuser',
                passwd: 'testpasswd',
            }),
        })
        const apiResult = await response.json()
        const token = await RedisClient.get('token/testuser')
        expect(apiResult).toMatchObject({
            token: token,
        })
    })
    it('[Positive] POST favo user test', async () => {
        const token = await RedisClient.get('token/testuser')
        const response = await SELF.fetch('https://example.com/favo', {
            method: 'POST',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                handle: 'testuser',
                token: token,
                id: 'testid',
            }),
        })
        const apiResult = await response.json()
        await sleep(10)
        // get value. default is 0
        const user = await RedisClient.get('user/testuser/testid').then(
            (value) => (value === null ? 0 : value),
        )
        const count = await RedisClient.get('favo/testid').then((value) =>
            value === null ? 0 : value,
        )
        expect(apiResult).toMatchObject({
            count: count,
            user: user,
        })
    })
    it('[Positive] GET user test', async () => {
        const response = await SELF.fetch(
            'https://example.com/user?handle=testuser',
            {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                },
            },
        )
        const apiResult = await response.json()
        // get value. default is 0
        const [_, keys] = await RedisClient.scan(0, {
            match: 'user/testuser/*',
        })
        const values: number[] =
            keys.length === 0 ? [0] : await RedisClient.mget(keys)
        const count = values.reduce((a, x) => a + x)
        expect(apiResult).toMatchObject({
            name: 'TestUser',
            count: count,
        })
    })
})
