import { RedisWrapper } from './rediswrapper'
import { z } from 'zod'
import { HeadersInit } from '@cloudflare/workers-types/experimental'
import * as favo from './favoextend.favo'

/**
 * API Error response interface
 */
interface ErrorResponse {
    error: string
    message: string
}

// ex: favoDB
class FavoExtend extends RedisWrapper {
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        // favoDB: value
        const favoDB = z.number()
        super(env, favoDB)
    }

    /**
     * favoDB; key generator
     * @param dbType choose DB type
     * @param body post body
     * @returns return FAVO/<PageId>/<UserHandle>
     */
    keyGenerator = (dbType: 'FAVO', body: favo.PostBody): string => {
        if (
            typeof body.handle !== 'undefined' &&
            (body.handle.match(/\//g) || []).length > 0
        ) {
            const e = new Error('Invalid Handle received')
            e.name = 'Invalid Request'
            throw e
        }
        const keyName =
            typeof body.handle !== 'undefined'
                ? `${dbType}/${body.id}/${body.handle}`
                : `${dbType}/${body.id}`
        if ((keyName.match(/\//g) || []).length > 3) {
            const e = new Error('Invalid keyName was created.')
            e.name = 'Server Error'
            throw e
        }
        return keyName
    }

    /**
     * add favorite count
     * @param id page id
     * @param user optional: user name
     * @returns return value after incremented
     */
    addFavo = async (body: favo.PostBody): Promise<number> => {
        return await this.incrValue(this.keyGenerator('FAVO', body))
    }

    getFavo = async (query: favo.GetQuery): Promise<number> => {
        // search key name
        const keyName = this.keyGenerator('FAVO', { id: query.id })
        const keys = await this.scan(`${keyName}*`)
        if (keys.length <= 0) {
            return 0
        }
        return await this.incrSum(keys)
    }

    createResponse = async (
        request: Request,
        headers: HeadersInit
    ): Promise<Response> => {
        let response: Response | null = null
        try {
            // if Content-type not json, error
            if (
                request.headers.get('Content-Type')?.includes('json') !== true
            ) {
                const e = new Error('Invalid Content-type Request received')
                e.name = 'Invalid Request'
                throw e
            }
            // Check method
            switch (request.method.toUpperCase()) {
                case 'POST': {
                    // validate body
                    const dummyBody: unknown = await request.json()
                    if (!favo.PostBody.safeParse(dummyBody).success) {
                        const e = new Error('Invalid Body Request received')
                        e.name = 'Invalid Request'
                        throw e
                    }
                    const body: favo.PostBody = favo.PostBody.parse(dummyBody)
                    response = new Response(
                        JSON.stringify(<favo.PostResponse>{
                            count: await this.addFavo(body),
                        }),
                        { status: 200, headers }
                    )
                    break
                }
                case 'GET': {
                    // Check URLQuery
                    const dummyQuery: unknown = Object.fromEntries(
                        new URL(request.url).searchParams.entries()
                    )
                    if (!favo.GetQuery.safeParse(dummyQuery).success) {
                        const e = new Error('Invalid Query Request received')
                        e.name = 'Invalid Request'
                        throw e
                    }
                    const query: favo.GetQuery = favo.GetQuery.parse(dummyQuery)
                    response = new Response(
                        JSON.stringify(<favo.GetResponse>{
                            count: await this.getFavo(query),
                        }),
                        { status: 200, headers }
                    )
                    break
                }
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                response = new Response(
                    JSON.stringify(<ErrorResponse>{
                        error: e.name,
                        message: e.message,
                    }),
                    { status: 500, headers }
                )
            }
        }
        if (response === null) {
            response = new Response(null, {
                status: 500,
                headers,
            })
        }
        return response
    }
}

export { FavoExtend }
