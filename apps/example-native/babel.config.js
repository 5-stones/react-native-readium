const path = require('path');
const pak = require('../../package.json');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: ['.tsx', '.ts', '.js', '.json'],
          alias: {
            [pak.name]: path.join(__dirname, '../..', pak.source),
          },
        },
      ],
      // NOTE: babel-preset-expo (SDK 54+) auto-adds 'react-native-worklets/plugin'
      // when react-native-worklets is installed. Adding it manually here would
      // apply the worklets transform twice and break Reanimated animations.
    ],
  };
};
