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
      // Prettier integration
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      
      // TypeScript strict rules
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      
      // Naming conventions (Requirements 8.1, 8.2, 8.3, 8.4, 8.5)
      '@typescript-eslint/naming-convention': [
        'error',
        // Classes, interfaces, type aliases, enums - PascalCase
        {
          selector: ['class', 'interface', 'typeAlias', 'enum'],
          format: ['PascalCase'],
        },
        // Variables and functions - camelCase
        {
          selector: ['variable', 'function'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // Constants - UPPER_SNAKE_CASE
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE'],
        },
        // Methods and properties - camelCase
        {
          selector: ['method', 'property'],
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // Enum members - PascalCase
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        // Type parameters - PascalCase
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
        },
      ],
      
      // Code complexity limits
      'complexity': ['error', 10],
      'max-depth': ['error', 4],
      'max-lines-per-function': ['error', {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
      }],
      'max-params': ['error', 4],
      
      // Best practices
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-return-await': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // NestJS specific patterns
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-member-accessibility': ['error', {
        accessibility: 'explicit',
        overrides: {
          constructors: 'no-public',
        },
      }],
    },
  },
);
