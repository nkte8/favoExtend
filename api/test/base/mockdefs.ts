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
            keyRef: 'token/*',
            functionName: 'scanAll',
            output: z.string().array(),
        },
        {
            functionName: 'typeGrep',
            output: z.string().array(),
            input: {
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
            keyRef: 'user/*',
            functionName: 'scanAll',
            output: z.string().array(),
        },
        {
            functionName: 'typeGrep',
            output: z.string().array(),
            input: {
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
            keyRef: 'user/${#.handle}/*',
            functionName: 'incrSum',
            output: z.number().default(0),
        },
        {
            keyRef: 'rank/favo',
            functionName: 'zaddSingle',
            input: {
                score: '${#0}',
                member: '${#.handle}',
            },
        },
        {
            keyRef: 'rank/favo',
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
            keyRef: 'rank/favo',
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
            keyRef: 'rank/favo',
            functionName: 'zremSingle',
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
            keyRef: '^user/[^\\/]+$',
            functionName: 'scanRegex',
            output: z.string().array(),
        },
        {
            functionName: 'arrayReplace',
            input: {
                array: '${#0}',
                regex: '^user\\/([^${}]*)',
                replace: '$1',
            },
            output: z.string().array(),
        },
        {
            keyRef: 'rank/favo',
            functionName: 'zrem',
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
            keyRef: '^user/[^\\/]+$',
            functionName: 'scanRegex',
            output: z.string().array(),
        },
        {
            functionName: 'arrayReplace',
            input: {
                array: '${#0}',
                regex: '^.*$',
                replace: '$&/*',
            },
            output: z.string().array(),
        },
        {
            functionName: 'incrSumMultiKeys',
            multiKeysRef: '${#1}',
            output: z.number().array(),
        },
        {
            functionName: 'arrayReplace',
            input: {
                array: '${#0}',
                regex: '^user\\/([^${}]*)',
                replace: '$1',
            },
            output: z.string().array(),
        },
        {
            functionName: 'objectExtract',
            input: {
                score: '${#2}',
                member: '${#3}',
            },
            output: z
                .object({
                    score: z.number(),
                    member: z.string(),
                })
                .array(),
        },
        {
            keyRef: 'rank/favo',
            functionName: 'zadd',
            input: '${#4}',
        },
    ],
)
export const TestRedefine = new Definition(
    {
        path: '/redefine',
        method: 'GET',
        output: '${#0}',
    },
    [
        {
            functionName: 'defineRef',
            input: {
                key1: 'value1',
                key2: 'value2',
            },
            output: z.object({
                key1: z.string(),
                key2: z.string(),
            }),
        },
    ],
)
export const TestRedefine2 = new Definition(
    {
        path: '/redefine2',
        method: 'GET',
        query: z.object({
            value1: z.string(),
            value2: z.string(),
            value3: z.string(),
        }),
        output: '${#0}',
    },
    [
        {
            functionName: 'defineRef',
            input: {
                value: '${#.value1}',
                array: ['${#.value2}', '${#.value3}'],
            },
            output: z.object({
                value: z.string(),
                array: z.string().array(),
            }),
        },
    ],
)

export const TestValuesToHalf = new Definition(
    {
        path: '/half',
        method: 'POST',
        input: z.number().array(),
        output: '${#1}',
    },
    [
        {
            functionName: 'numSum',
            input: '${#}',
            output: z.number(),
        },
        {
            functionName: 'numAvg',
            input: ['${#0}', 0],
            output: z.number(),
        },
    ],
)

export const TestJsonSafeadd = new Definition(
    {
        path: '/safeaddDate',
        method: 'POST',
        input: z.object({
            handle: z.string(),
        }),
        output: {
            name: '${#2.name}',
            refreshedAt: '${#2.refreshedAt}',
        },
    },
    [
        {
            functionName: 'nowUnixTime',
            opts: {
                tdiff: 9,
            },
            output: z.number(),
        },
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonSetSafe',
            input: {
                refreshedAt: '${#0}',
            },
        },
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonGet',
            output: z.object({
                name: z.string(),
                passwd: z.string(),
                refreshedAt: z.number(),
            }),
        },
    ],
)

export const TestJsonDel = new Definition(
    {
        path: '/jsonDel',
        method: 'POST',
        input: z.object({
            handle: z.string(),
        }),
        output: {
            result: 'OK',
        },
    },
    [
        {
            keyRef: 'user/${#.handle}',
            functionName: 'jsonDel',
            opts: {
                path: '$.refreshedAt',
            },
        },
    ],
)

export const TestNumCompare = new Definition(
    {
        path: '/compare',
        method: 'GET',
        query: z.object({
            value: z.string(),
        }),
        output: '${#2}',
    },
    [
        {
            functionName: 'defineRef',
            input: {
                border: 10,
            },
            output: z.object({
                border: z.number(),
            }),
        },
        {
            functionName: 'parseNum',
            input: '${#.value}',
            output: z.number(),
        },
        {
            functionName: 'numCompare',
            input: ['${#0.border}', '${#1}'],
            opts: {
                operator: 'lt',
            },
            output: z.boolean(),
        },
    ],
)

export const TestThrowError = new Definition(
    {
        path: '/error',
        method: 'GET',
    },
    [
        {
            functionName: 'defineRef',
            input: true,
            output: z.boolean(),
        },
        {
            functionName: 'throwError',
            input: '${#0}',
            opts: {
                name: 'UserError',
                status: 400,
                message: 'User Caused Error',
            },
        },
    ],
)
export const TestIsSame = new Definition(
    {
        path: '/issame',
        method: 'POST',
        input: z.string().array(),
        output: '${#0}',
    },
    [
        {
            functionName: 'isSame',
            input: '${#}',
            output: z.boolean(),
        },
    ],
)
export const TestIsSameNotAll = new Definition(
    {
        path: '/issamenotall',
        method: 'POST',
        input: z.string().array(),
        output: '${#0}',
    },
    [
        {
            functionName: 'isSame',
            input: '${#}',
            opts: {
                notAll: true,
            },
            output: z.boolean(),
        },
    ],
)
