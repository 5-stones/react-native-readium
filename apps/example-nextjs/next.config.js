const path = require('path');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE_BUNDLE === '1',
});

// this can be used to obtain a more readable bundle for debugging
const disableMinification = process.env.DISABLE_MINIFICATION === '1';

const config = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@gorhom/bottom-sheet',
    '@react-native-community/slider',
    '@react-navigation/native',
    '@react-navigation/native-stack',
    '@rneui/base',
    '@rneui/themed',
    'common-app',
    'react-native-fs',
    'react-native-gesture-handler',
    'react-native-ratings',
    'react-native-reanimated',
    'react-native-worklets',
    'react-native-readium',
    'react-native-safe-area-context',
    'react-native-screens',
    'react-native-size-matters',
    'react-native-vector-icons',
    'react-native-web',
    'react-native',
  ],
  webpack(webpackConfig, { isServer, webpack }) {
    if (disableMinification) {
      webpackConfig.optimization.minimizer = [];
    }

    // Define global variables
    webpackConfig.plugins.push(
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      })
    );

    // Polyfill `global` for browser (needed by @gorhom/bottom-sheet and gesture handler)
    if (!isServer) {
      webpackConfig.plugins.push(
        new webpack.BannerPlugin({
          banner: 'if(typeof global==="undefined"){var global=globalThis;}',
          raw: true,
        })
      );
    }

    // Configure aliases - must be done for both client and server
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias || {}),
      // Ensure single React instance (use workspace root for Yarn workspaces)
      'react': path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      // Alias react-native to react-native-web
      'react-native$': path.resolve(__dirname, 'react-native-shim.js'),
      'react-native': path.resolve(__dirname, 'react-native-shim.js'),
      // Ensure single instance of react-native-reanimated
      'react-native-reanimated': path.resolve(
        __dirname,
        '../../node_modules/react-native-reanimated'
      ),
      // Ensure single instance of safe-area-context
      'react-native-safe-area-context': path.resolve(
        __dirname,
        '../../node_modules/react-native-safe-area-context'
      ),
      // Use web-specific implementation for Readium (source files)
      'react-native-readium$': path.resolve(__dirname, '../../src/index.tsx'),
      // Use source files for react-native-ratings (dist has JSX)
      'react-native-ratings': path.resolve(
        __dirname,
        '../../node_modules/react-native-ratings/src'
      ),
    };

    // Ensure proper extensions
    webpackConfig.resolve.extensions = [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
      '.wasm',
      ...(webpackConfig.resolve.extensions || []).filter(
        (ext) =>
          ![
            '.web.tsx',
            '.web.ts',
            '.web.jsx',
            '.web.js',
            '.tsx',
            '.ts',
            '.jsx',
            '.js',
          ].includes(ext)
      ),
    ];

    // Add font file loader for react-native-vector-icons
    webpackConfig.module.rules.push({
      test: /\.(ttf|otf|eot|woff|woff2)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/fonts/[name][ext]',
      },
    });

    // Add EPUB file loader
    webpackConfig.module.rules.push({
      test: /\.(epub)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/books/[name][ext]',
      },
    });

    return webpackConfig;
  },
};

module.exports = withBundleAnalyzer(config);
