import { RedisWrapper } from './rediswrapper'
import { z } from 'zod'

// Example FavoExtend

/**
 * Favorite Database interface
 */
const ZodFavodb = z.object({
    Id: z.string(),
    favoCount: z.number(),
})
type Favodb = z.infer<typeof ZodFavodb>

/**
 * API GET request URL query params
 */
const FavoExtendRequestGETQuery: string[] = ['id']

/**
 * API POST request body
 */
const ZodFavoExtendRequestPOSTBody = z.object({
    id: z.string(),
})
type FavoExtendRequestPOSTBody = z.infer<typeof ZodFavoExtendRequestPOSTBody>

/**
 * API response interface
 */
interface FavoExtendResponse {
    count: number
}

/**
 * API Error response interface
 */
interface FavoExtendErrorResponse {
    error: string
    message: string
}

/**
 * FavoExtend example class
 * @function addFavo Increase favo count 
 * @function readFavo Load favo count
 * @function createResponse create response by request
 */
class FavoExtend extends RedisWrapper {
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        super(env)
    }
    // Zod parser
    private validator = (value: any) => ZodFavodb.safeParse(value).success

    // Add Favorite count
    addFavo = async (Id: string): Promise<number | false> => {
        try {
            const value: Favodb | null = await this.readValue<Favodb>(
                Id,
                this.validator
            )
            // If record not found, create new
            const record: Favodb = {
                Id,
                favoCount: value === null ? 0 : value.favoCount,
            }
            record.favoCount += 1
            this.writeValue<Favodb>(Id, record)
            return record.favoCount
        } catch (e: unknown) {
            return false
        }
    }
    // Read Favorite count from ID
    readFavo = async (Id: string): Promise<number> => {
        try {
            const value: Favodb | false =
                await this.readValueIfValidated<Favodb>(Id, this.validator)
            // If record not found, create new
            const record: Favodb = {
                Id,
                favoCount: value === false ? 0 : value.favoCount,
            }
            this.writeValue<Favodb>(Id, record)
            return record.favoCount
        } catch (e: unknown) {
            return 0
        }
    }

    createResponse = async (
        request: Request,
        headers: HeadersInit
    ): Promise<Response> => {
        let response: Response | null = null
        try {
            if (
                request.headers.get('Content-Type')?.includes('json') !== true
            ) {
                const e = new Error('Invalid Request')
                e.name = 'FavoExtend::createResponse'
                throw e
            }
            switch (request.method.toUpperCase()) {
                case 'POST':
                    // validate body
                    const dummyBody: unknown = await request.json()
                    if (
                        !ZodFavoExtendRequestPOSTBody.safeParse(dummyBody)
                            .success
                    ) {
                        const e = new Error('Invalid Request')
                        e.name = 'FavoExtend::createResponse'
                        throw e
                    }
                    const body = dummyBody as FavoExtendRequestPOSTBody
                    // kick addFavo
                    const result = await this.addFavo(body.id)
                    if (result === false) {
                        const e = new Error('Failed to increase favo counter')
                        e.name = 'FavoExtend::createResponse'
                        throw e
                    }
                    response = new Response(
                        JSON.stringify(<FavoExtendResponse>{
                            count: result,
                        }),
                        { status: 200, headers }
                    )
                    break
                case 'GET':
                    // Check URLQuery
                    const Url: URL = new URL(request.url)
                    // Reject not defined query
                    Url.searchParams.forEach((_, key) => {
                        if (FavoExtendRequestGETQuery.indexOf(key) === -1) {
                            const e = new Error('Invalid Request')
                            e.name = 'FavoExtend::createResponse'
                            throw e
                        }
                    })
                    const id = Url.searchParams.get('id')
                    // if id not found, throw error
                    if (id === null) {
                        const e = new Error('Invalid Request')
                        e.name = 'FavoExtend::createResponse'
                        throw e
                    }
                    response = new Response(
                        JSON.stringify(<FavoExtendResponse>{
                            count: await this.readFavo(id),
                        }),
                        { status: 200, headers }
                    )
                    break
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                response = new Response(
                    JSON.stringify(<FavoExtendErrorResponse>{
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
