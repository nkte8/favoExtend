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
            result: 'ok',
        },
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
            functionName: 'jsonGetThrowError',
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
            functionName: 'isSame',
            input: ['${#.passwd}', '${#0}'],
            output: z.boolean()
        },
        {
            keyRef: 'token/${#.handle}',
            functionName: 'generateToken',
            output: z.string(),
            ifRef: '${#1}',
        },
    ],
)

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
            functionName: 'isSame',
            input: ['${#.token}', '${#0}'],
            output: z.boolean(),
        },
        {
            keyRef: 'user/${#.handle}/${#.id}',
            functionName: 'incr',
            output: z.number(),
            ignoreFail: true,
            ifRef: '${#1}',
        },
        {
            keyRef: 'favo/${#.id}',
            functionName: 'incr',
            output: z.number(),
        },
    ],
)
