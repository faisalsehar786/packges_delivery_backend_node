module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base', 'prettier', 'plugin:node/recommended'],
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'warn',
    'no-underscore-dangle': 'off',
    'no-use-before-define': 'off',
    camelcase: ['off'],
    'prefer-promise-reject-errors': 'off',
    'consistent-return': 'off',
  },
};
