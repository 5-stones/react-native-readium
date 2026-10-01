const path = require('path');
const packages = path.join(__dirname, '../../packages');
const workspacePackages = ['react-native-readium'];

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        // Resolve workspace libraries to their sources, so edits apply without a build.
        alias: Object.fromEntries(
          workspacePackages.map((name) => {
            const pak = require(path.join(packages, name, 'package.json'));
            return [name, path.join(packages, name, pak.source)];
          })
        ),
      },
    ],
    'react-native-worklets/plugin',
  ],
};
