import { z } from 'zod'
/**
 * API GET request URL query params
 */
const GetQuery = z.object({
    id: z.string(),
})
type GetQuery = z.infer<typeof GetQuery>

/**
 * API GET response body
 */
type GetResponse = {
    count: number
}

/**
 * API POST request body
 */
const PostBody = z.object({
    id: z.string(),
    handle: z.string().optional(),
})
type PostBody = z.infer<typeof PostBody>

/**
 * API POST response body
 */
type PostResponse = {
    count: number
}

export { GetQuery, PostBody, type PostResponse, type GetResponse }
