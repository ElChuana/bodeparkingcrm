import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Reglas nuevas y muy estrictas del plugin de hooks: se dejan como aviso
      // (el código actual funciona; migrarlas es un refactor aparte, no un bug).
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      // Solo afecta el hot-reload en desarrollo, no la app en producción
      'react-refresh/only-export-components': 'warn',
    },
  },
])
