import { Definition } from '@/base/Definition'
import { z } from 'zod'

export const TestScanMget = new Definition(
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
            opts: {
                type: "string" 
            }
        },
    ],
)
