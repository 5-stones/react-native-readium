const path = require('path');
const packages = path.join(__dirname, '../../packages');
const workspacePackages = ['react-native-readium', 'react-native-readium-lcp'];

module.exports = {
  dependencies: Object.fromEntries(
    workspacePackages.map((name) => [name, { root: path.join(packages, name) }])
  ),
};
