// eslint.config.js (ESLint v9 flat config)
module.exports = [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      // Add any custom rules here
    },
  },
];
