// @ts-check

// @ts-ignore Needed due to moduleResolution Node vs Bundler
import { tanstackConfig } from '@tanstack/eslint-config'
import pluginCspell from '@cspell/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  ...tanstackConfig,
  {
    name: 'react-sockas/main',
    plugins: {
      cspell: pluginCspell,
      'react-hooks': reactHooks,
    },
    rules: {
      'cspell/spellchecker': [
        'warn',
        {
          cspell: {
            words: [
              'sockas', // Our package name
              'tanstack', // Our peer dependency scope
              'refetches', // Query refetch operations
              'tsup', // We use tsup as builder
              'typecheck', // Field of vite.config.ts
            ],
          },
        },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-case-declarations': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
