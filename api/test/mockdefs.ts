import { Definition } from '@/base/Definition'
import { z } from 'zod'

export const TestScanMget = new Definition(
    {
        path: '/allActivetoken',
        method: 'GET',
        output: '{#0}',
    },
    [
        {
            keyPattern: 'token/*',
            functionName: 'scanMget',
            output: z.string().array(),
        },
    ],
)
