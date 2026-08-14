import vue from 'eslint-plugin-vue'

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  ...vue.configs['flat/recommended'],
  {
    files: ['src/**/*.{js,vue}'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/attributes-order': 'off',
      'vue/html-self-closing': 'off',
    },
  },
]
