import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/coverage/**', '**/playwright-report/**', '**/test-results/**', 'src/shared/api/generated/**'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/rules',
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/*', '!@/modules/*/index'],
              message: 'Importa otros módulos solo a través de su index.ts público.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'app/shared-isolation',
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/modules/**', '@/app/**'], message: 'shared/ no puede depender de modules/ ni de app/.' },
          ],
        },
      ],
    },
  },
  {
    name: 'app/module-internal',
    files: ['src/modules/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['@/app/**'], message: 'Los módulos no dependen de app/.' }],
        },
      ],
    },
  },
  {
    name: 'app/tests',
    files: ['tests/**'],
    rules: {
      'no-restricted-imports': 'off',
      'vue/one-component-per-file': 'off',
    },
  },
  skipFormatting,
);
