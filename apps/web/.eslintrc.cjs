module.exports = {
  extends: ['../../.eslintrc.cjs', 'plugin:react-hooks/recommended'],
  plugins: ['react-refresh'],
  env: {
    browser: true,
    es2022: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
