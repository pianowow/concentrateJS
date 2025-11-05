import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import tsParser from '@typescript-eslint/parser';

export default defineConfig([
   {
      name: 'app/files-to-lint',
      files: ['**/*.{js,mjs,jsx,ts,tsx,mts,cts,vue}'],
   },

   globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

   {
      languageOptions: {
         globals: {
            ...globals.browser,
         },
      },
   },

   js.configs.recommended,
   ...pluginVue.configs['flat/essential'],
   ...tseslint.configs.recommended,
   {
      files: ['**/*.vue'],
      languageOptions: {
         parserOptions: { parser: tsParser },
      },
   },
]);
