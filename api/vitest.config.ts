import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import * as path from 'path'

export default defineWorkersConfig({
    test: {
        poolOptions: {
            workers: {
                wrangler: { configPath: './wrangler.toml' },
            },
        },
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        include: [
            'test/favoExtend/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'test/base/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
    },
})
