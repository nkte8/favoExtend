import { HeadersInit } from '@cloudflare/workers-types/experimental'
import { FavoExtend } from './example/favoExtend'

export interface Env {
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
    CORS_ALLOW_ORIGIN: string
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Response header
        const header: HeadersInit = {
            'Access-Control-Allow-Origin': env.CORS_ALLOW_ORIGIN,
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        // Allow Options method
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: header,
            })
        }
        // create client example
        const Client = new FavoExtend({
            UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL,
            UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN,
        })

        const response: Response = await Client.createResponse(request, header)
        return response
    },
}
