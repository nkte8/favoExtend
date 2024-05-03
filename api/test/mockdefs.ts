import { Definition } from '@/base/Definition'
import { z } from 'zod'

export const TestGetTokens = new Definition(
    {
        path: '/allActivetoken',
        method: 'GET',
        output: '${#2}',
    },
    [
        {
            keyPattern: 'token/*',
            functionName: 'scan',
            output: z.string().array(),
        },
        {
            functionName: 'typeGrep',
            output: z.string().array(),
            opts: {
                keys: '${#0}',
                type: 'string',
            },
        },
        {
            functionName: 'mget',
            multiKeysRef: '${#1}',
            output: z.string().array(),
        },
    ],
)

export const TestGetUsers = new Definition(
    {
        path: '/allUsers',
        method: 'GET',
        output: '${#2}',
    },
    [
        {
            keyPattern: 'user/*',
            functionName: 'scan',
            output: z.string().array(),
        },
        {
            functionName: 'typeGrep',
            output: z.string().array(),
            opts: {
                keys: '${#0}',
                type: 'json',
            },
        },
        {
            functionName: 'jsonMget',
            multiKeysRef: '${#1}',
            output: z
                .object({
                    name: z.string(),
                    passwd: z.string(),
                })
                .array(),
        },
    ],
)

export const TestAddRanking = new Definition(
    {
        path: '/addRank',
        method: 'POST',
        input: z.object({
            handle: z.string(),
        }),
        output: { rank: '${#2}' },
    },
    [
        {
            keyPattern: 'user/${#.handle}/*',
            functionName: 'incrSum',
            output: z.number().default(0),
        },
        {
            keyPattern: 'rank/favo',
            functionName: 'zadd',
            input: {
                score: '${#0}',
                member: '${#.handle}',
            },
        },
        {
            keyPattern: 'rank/favo',
            functionName: 'zrevrank',
            input: '${#.handle}',
            output: z.number(),
        },
    ],
)
export const TestShowRanking = new Definition(
    {
        path: '/showRank',
        method: 'GET',
        output: { ranking: '${#0}' },
    },
    [
        {
            keyPattern: 'rank/favo',
            functionName: 'zrange',
            input: {
                min: 0,
                max: -1,
            },
            opts: {
                rev: true,
            },
            output: z.string().array(),
        },
    ],
)
export const TestRemoveRanking = new Definition(
    {
        path: '/rmRank',
        method: 'POST',
        input: z.object({
            handle: z.string(),
        }),
        output: { result: 'OK' },
    },
    [
        {
            keyPattern: 'rank/favo',
            functionName: 'zrem',
            input: '${#.handle}',
        },
    ],
)

export const TestRmRankingAllUser = new Definition(
    {
        path: '/rmRankAlluser',
        method: 'POST',
        output: { result: 'OK' },
    },
    [
        {
            keyPattern: '^user/[^\\/]+$',
            functionName: 'scanRegex',
            output: z.string().array(),
        },
        {
            functionName: 'arrayReplace',
            opts: {
                array: '${#0}',
                regex: '^user\\/([^${}]*)',
                replace: '$1',
            },
            output: z.string().array(),
        },
        {
            keyPattern: 'rank/favo',
            functionName: 'zremArray',
            input: '${#1}',
        },
    ],
)


export const TestAddRankingAllUser = new Definition(
    {
        path: '/addRankAlluser',
        method: 'POST',
        output: { result: 'OK' },
    },
    [
        {
            keyPattern: '^user/[^\\/]+$',
            functionName: 'scanRegex',
            output: z.string().array(),
        },
        {
            functionName: 'incrSumMultiKeys',
            multiKeysRef: '${#0}',
            output: z.number().array(),
        },
        {
            functionName: 'arrayReplace',
            opts: {
                array: '${#0}',
                regex: '^user\\/([^${}]*)',
                replace: '$1',
            },
            output: z.string().array(),
        },
        {
            functionName: 'objectExtract',
            opts: {
                score: '${#1}',
                member: '${#2}',
            },
            output: z
                .object({
                    score: z.number(),
                    member: z.string(),
                })
                .array(),
        },
        {
            keyPattern: 'rank/favo',
            functionName: 'zaddArray',
            input: '${#3}',
        },
    ],
)
