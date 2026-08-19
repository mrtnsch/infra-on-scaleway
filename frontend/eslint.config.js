//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      // Import ordering is prettier's business here, not eslint's.
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    // The generated orval client is the *only* thing allowed to reach into
    // `#/generated`. Everything else goes through the wrappers in
    // `features/jokes/api.ts`, which own the response-envelope unwrapping and
    // the error type — see the comment at the top of that file.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/jokes/api.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#/generated/api/jokes/*', '#/generated/api/jokes'],
              message:
                'Import the generated hooks through #/features/jokes/api instead — it unwraps the response envelope and fixes the error type. Model *types* from #/generated/api/model are fine.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/generated/**',
      'src/routeTree.gen.ts',
      'dist/**',
    ],
  },
]
