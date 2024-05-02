import { Definition } from '@/base/Definition'
import { z } from 'zod'

export const TestGetTokens = new Definition(
    {
        path: '/allActivetoken',
        method: 'GET',
        output: '{#2}',
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
                keys: "{#0}",
                type: "string" 
            }
        },
        {
            functionName: 'mget',
            multiKeysRef: "{#1}",
            output: z.string().array(),
        },
    ],
)

export const TestGetUsers = new Definition(
    {
        path: '/allUsers',
        method: 'GET',
        output: '{#2}',
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
                keys: "{#0}",
                type: "json" 
            }
        },
        {
            functionName: 'jsonMget',
            multiKeysRef: "{#1}",
            output: z.object({
                name: z.string(),
                passwd: z.string(),
            }).array(),
        },
    ],
)
