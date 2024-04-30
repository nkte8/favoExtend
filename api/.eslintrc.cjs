module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: ['@typescript-eslint', 'react', 'cflint'],
    settings: {
        react: {
            version: 'detect',
        },
    },
    rules: {
        'cflint/no-substr': 1,
        'cflint/no-this-assignment': 1,
        'no-irregular-whitespace': 'warn',
        'prefer-const': 'warn',
        '@typescript-eslint/strict-boolean-expressions': [
            'warn',
            { allowString: false, allowNumber: false, allowNullableObject: false },
        ],
        '@typescript-eslint/no-namespace': 'warn',
        '@typescript-eslint/no-unused-vars': [
            'warn',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        '@typescript-eslint/no-misused-promises': [
            'warn',
            {
                checksVoidReturn: {
                    attributes: false,
                },
            },
        ],
    },
    ignorePatterns: ['dist', '.wrangler', 'node_modules', 'jest.config.cjs'],
    overrides: [
        {
            files: ['*.{tsx, jsx}'],
            extends: ['plugin:react/recommended', 'plugin:react/jsx-runtime'],
        },
        {
            files: ['.eslintrc.{js,cjs}'],
            env: {
                node: true,
            },
            parserOptions: {
                sourceType: 'script',
            },
            extends: ['plugin:@typescript-eslint/disable-type-checked'],
        },
        {
            files: ['tests/**/*'],
            extends: ['plugin:@typescript-eslint/disable-type-checked'],
        },
    ],
}
