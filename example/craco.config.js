const path = require('path');
const babelInclude = require('@dealmore/craco-plugin-babel-include');
const webpack = require('webpack');

const LIB_PATH = `../src`;
const WEB_PATH = `../web`;

module.exports = {
  // eslint has a dumb error, don't really care if the example is linted so disable it
  eslint: { enable: false },
  webpack: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-readium': path.resolve(__dirname, LIB_PATH),
      // make sure we don't include multiple versions of react
      'react': path.resolve(__dirname, './node_modules/react'),
    },
    plugins: {
        add: [
          new webpack.EnvironmentPlugin({ JEST_WORKER_ID: null }),
          new webpack.DefinePlugin({
            process: { env: {} },
            __DEV__: true,
          })
        ],
      },
  },
  babel: {
    presets: [
      '@babel/preset-react',
      '@babel/preset-typescript',
    ],
  },
  plugins: [
    {
      plugin: babelInclude,
      options: {
        include: [
          path.resolve(__dirname, 'node_modules/@rneui/base'),
          path.resolve(__dirname, 'node_modules/@rneui/themed'),
          path.resolve(__dirname, 'node_modules/react-native-vector-icons'),
          path.resolve(__dirname, 'node_modules/react-native-ratings'),
          path.resolve(__dirname, LIB_PATH),
          path.resolve(__dirname, WEB_PATH),
        ],
      },
    },
  ],
};
