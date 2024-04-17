# Client

API Core code.

## rediswrapper.ts

Basical Redis Client Wrapper
- writeValue
    - key: string | The Key register to Redis DB.
    - value: T | The Value register to Redis DB with parse object to JSON string.
    - ttl: number | Set data retention period. If ttl = -1, data storage period will be unlimited.

## In future

Upstash Redis developing about secondary query wrapper.

https://github.com/upstash/query

After `@upstash/query` become stable, favoExtend will adopt it.
