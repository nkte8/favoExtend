// test/index.spec.ts
import { env, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import worker from '../src/index'

describe('API test', () => {
    // unit style
    it('[Negative] Access direct test', async () => {
        const request = new Request('https://example.com', { method: 'GET' })
        const response = await worker.fetch(request, env)
        expect(await response.text()).toMatch(
            JSON.stringify({
                error: 'FavoExtend::createResponse',
                message: 'Invalid Request',
            })
        )
    })
    // integration style
    it('[Positive] GET contents', async () => {
        const response = await SELF.fetch('https://example.com?id=hoge', {
            method: 'GET',
            headers: {
                'Content-type': 'application/json',
            },
        })
        expect(await response.text()).toMatch(
            JSON.stringify({
                count: 0,
            })
        )
    })

    
})
