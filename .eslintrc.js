const path = require('path');

/** @type {import('eslint').Linter.Config} */
module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: ['xo'],
	parserOptions: {
		ecmaVersion: 'latest',
		sourceType: 'module',
		project: path.join(__dirname, './tsconfig.json'),
	},
	plugins: ['unused-imports'],
	rules: {
		'unused-imports/no-unused-imports': 'error',
		'no-negated-condition': 0,
	},
	overrides: [
		{
			extends: [
				'xo-typescript',
				'plugin:react/recommended',
				'@react-native-community',
				'xo-react',
				'prettier',
			],
			plugins: ['react', 'prettier'],
			files: ['*.ts', '*.tsx'],
			settings: {
				react: {
					version: 'detect',
				},
				'import/resolver': {
					typescript: {project: ['./example/tsconfig.json', './tsconfig.json']},
				},
			},
			rules: {
				'prettier/prettier': [
					'error',
					{},
					{
						usePrettierrc: true,
					},
				],
				'react/function-component-definition': [
					'error',
					{
						namedComponents: 'arrow-function',
						unnamedComponents: 'arrow-function',
					},
				],
				'react-native/no-inline-styles': 0,
				'@typescript-eslint/ban-types': 0,
				'@typescript-eslint/member-ordering': 0,
				'react/require-default-props': 0,
			},
		},
		{
			files: ['*.js'],
			extends: ['xo'],
			plugins: ['import'],
			settings: {
				'import/resolver': {
					node: {
						extensions: ['.js', '.jsx', '.ts', '.tsx'],
					},
				},
			},
			rules: {
				'import/extensions': [
					'error',
					'ignorePackages',
					{
						ts: 'never',
						tsx: 'never',
					},
				],
			},
		},
	],
};
