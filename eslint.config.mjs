// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    // ARCHITECTURE DECISION: Strict Type Boundary
    // The core production modules (questions, assessments, runtime, grading) are strictly typed.
    // Supplementary modules and all test files are freed from fighting library type limitations
    // by turning off unsafe rules.
    files: [
      '**/*.spec.ts',
      '**/*.e2e-spec.ts',
      'test/**/*.ts',
      'src/modules/auth/**/*.ts',
      'src/modules/clients/**/*.ts',
      'src/modules/participants/**/*.ts',
      'src/modules/webhooks/**/*.ts',
      'src/modules/question-banks/**/*.ts',
      'src/modules/topics/**/*.ts',
      'src/modules/reports/**/*.ts',
      'src/modules/ai/**/*.ts',
      'src/common/**/*.ts',
      'src/modules/realtime/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }

);
