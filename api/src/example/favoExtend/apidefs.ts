import { Definition } from '@/base/Definition'
import { z } from 'zod'

/**
 * handle parameter rule:
 *  you can manage input parameter with Zod object
 * example: letters must over 5, not start at number, include only half-width
 */
const handleRule = /^[a-zA-Z][a-zA-Z0-9]{4,}$/

/**
 * id parameter rule:
 * example: letters must over 5, include half-width and '-' or '_' only
 */
const idRule = /^[a-zA-Z0-9_-]{5,}$/


/**
 * This is definition of...
 *  Request method -> GET
 *   Request url -> https://example.com/favo?id=<string>
 *   Request body -> no body
 *   Will Response -> { count: <number | redis action #0 result> }
 *  Redis action(#0) -> getUndefinedAble
 *   Read definition -> key: favo/<id string>, output: <number = #0>
 *    output: <number = #0, if no data, return 0 >
 */
export const GetFavo = new Definition(
    {
        path: '/favo',
        method: 'GET',
        query: z.object({
            id: z.string().regex(idRule),
        }),
        output: { count: '${#0}' },
    },
    [
        {
            keyRef: 'favo/${#.id}',
            functionName: 'get',
            output: z.number().default(0),
        },
    ],
)

/**
 * This is definition of...
 *  Request method -> POST
 *   Request -> https://example.com/favo
 *   Request body -> { id: <string> } or { id: <string>, handle: <string> } (handle is optional)
 *   Will Response -> { count: <number | redis action #1 result> }
 *  Redis action(#0) -> Incr
 *   Incr definition -> ...
 *    key: user/<handle string>/<id string>,
 *    output: <number = #0>
 *  Redis action(#1) -> Incr
 *   Incr definition -> ...
 *    key: user/<handle string>/<id string>,
 *    output: <number = #1>
 */
export const PostFavo = new Definition(
    {
        path: '/favo',
        method: 'POST',
        input: z.object({
            id: z.string().regex(idRule),
            handle: z.string().regex(handleRule).optional(),
        }),
        output: { count: '${#1}' },
    },
    [
        {
            keyRef: 'user/${#.handle}/${#.id}',
            functionName: 'incr',
            output: z.number(),
            ignoreFail: true,
        },
        {
            keyRef: 'favo/${#.id}',
            functionName: 'incr',
            output: z.number(),
        },
    ],
)

/**
 * This is definition of...
 *  Request method -> POST
 *   Request -> https://example.com/user
 *   Request body -> { handle: <string>, name: <string>, passwd: <string> }
 *   Will Response -> no response
 *  Redis action(#0) -> Set
 *   Set definition -> ...
 *    key: user/<handle string>
 *    output: <number = #0>
 */
export const PostUserEdit = new Definition(
    {
        path: '/user',
        method: 'POST',
        input: z.object({
            handle: z.string().regex(handleRule),
            name: z.string(),
            passwd: z.string(),
        }),
        output: {
            result: "ok"
        }
    },
    [
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonSet',
            input: {
                name: '${#.name}',
                passwd: '${#.passwd}',
            },
        },
    ],
)

/**
 * This is definition of...
 *  Request method -> GET
 *   Request -> https://example.com/user?handle=<string>
 *   Request body -> no body
 *   Will Response -> { name: <string, #0.name>, count: <number, #1> }
 *  Redis action(#0) -> Get
 *   Get definition -> ...
 *    key: user/<handle string>
 *    output: <object = #0, #0={name: <string>, passwd: <string>}>
 *  Redis action(#1) -> incrSum
 *   incrSum definition -> ...
 *    key: user/<handle string>/*
 *    output: <number = #1, if no data, return 0 >
 */
export const GetUser = new Definition(
    {
        path: '/user',
        method: 'GET',
        query: z.object({
            handle: z.string().regex(handleRule),
        }),
        output: {
            name: '${#0.name}',
            count: '${#1}',
        },
    },
    [
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonGet',
            output: z.object({
                name: z.string(),
                passwd: z.string(),
            }),
        },
        {
            keyRef: 'user/${#.handle}/*',
            functionName: 'incrSum',
            output: z.number().default(0),
        },
    ],
)

/**
 * Extend example: This is definition of...
 *  Request method -> POST
 *   Request -> https://example.com/login
 *   Request body -> { handle: <string>, pencoded: <string> }
 *   Will Response -> { token: <string = #2> }
 *  Redis action(#0) -> jsonGet
 *   jsonGet definition -> ...
 *    key: user/<handle string>
 *    opts: { path: "$.passwd" } <-- get (root).passwd value from DB(Json)
 *    output: <number = #0>
 *   auth definition -> ... <---- Extend function(your define)
 *    key: undefined
 *    opts: {
 *       verifySrc: "{pencoded}"  <-- get pencoded from Request body
 *       verifyDist: "{#0}" <--- get value from Redis action(#0) output
 *      }
 *    output: undefined
 *   generateToken definition -> ... <---- Extend function(your define)
 *    key: token/{handle}
 *    output: <string = #2>
 */
export const Login = new Definition(
    {
        path: '/login',
        method: 'POST',
        input: z.object({
            handle: z.string().regex(handleRule),
            passwd: z.string(),
        }),
        output: {
            token: '${#2}',
        },
    },
    [
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonGet',
            output: z.string(),
            opts: {
                path: '$.passwd',
            },
        },
        {
            functionName: 'auth',
            opts: {
                verifySrc: '${#.passwd}',
                verifyDist: '${#0}',
            },
        },
        {
            keyRef: 'token/${#.handle}',
            functionName: 'generateToken',
            output: z.string(),
        },
    ],
)

/**
 * Extend example: This is definition of...
 *  Request method -> POST
 *   Request -> https://example.com/favo
 *   Request body -> {
 *     id: <string>,
 *     handle: <string or undefined>,
 *     token: <string or undefined>
 *   }
 *   Will Response -> { count: <number | redis action #1 result> }
 *  Redis action(#0) -> Incr
 *   Incr definition -> ...
 *    key: user/<handle string>/<id string>,
 *    output: <number = #0>
 *  Redis action(#1) -> Incr
 *   Incr definition -> ...
 *    key: user/<handle string>/<id string>,
 *    output: <number = #1>
 */
export const PostFavoWithAuth = new Definition(
    {
        path: '/favo',
        method: 'POST',
        input: z.object({
            id: z.string().regex(idRule),
            handle: z.string().regex(handleRule).optional(),
            token: z.string().optional(),
        }),
        output: {
            count: '${#3}',
            user: '${#2}',
        },
    },
    [
        {
            keyRef: 'token/${#.handle}',
            functionName: 'get',
            output: z.string(),
            ignoreFail: true,
        },
        {
            functionName: 'auth',
            opts: {
                verifySrc: '${#.token}',
                verifyDist: '${#0}',
            },
            ignoreFail: true,
        },
        {
            keyRef: 'user/${#.handle}/${#.id}',
            functionName: 'incr',
            output: z.number(),
            ignoreFail: true,
            dependFunc: [0, 1],
        },
        {
            keyRef: 'favo/${#.id}',
            functionName: 'incr',
            output: z.number(),
        },
    ],
)
