# React Native Readium - Next.js Example

This is a Next.js web example demonstrating the use of `react-native-readium` in a web environment using `react-native-web`.

## Features

- EPUB reader powered by Readium
- Web-based implementation using Next.js
- Shared components from `common-app` workspace
- Table of contents navigation
- Reading preferences customization
- Dark theme support

## Getting Started

### Prerequisites

- Node.js >= 20
- Yarn

### Installation

From the root of the monorepo:

```bash
yarn install
```

### Development

Run the development server:

```bash
# From the root
yarn example:nextjs dev

# Or from this directory
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Build

Build the production bundle:

```bash
yarn build:next
```

### Analyze Bundle

To analyze the bundle size:

```bash
yarn build:analyze
```

## Project Structure

- `/pages` - Next.js pages
  - `_app.tsx` - Custom App component
  - `_document.tsx` - Custom Document component with react-native-web setup
  - `index.tsx` - Main page that loads the Reader
- `/components` - React components
  - `ReaderApp.tsx` - Main reader application component
- `/public` - Static assets
- `next.config.js` - Next.js configuration
- `react-native-shim.js` - Shim to alias react-native to react-native-web

## How It Works

This example uses `react-native-web` to render React Native components in the browser. The Next.js webpack configuration is set up to:

1. Transpile React Native packages using `transpilePackages`
2. Alias `react-native` to `react-native-web` via the shim
3. Configure proper module resolution for the monorepo structure
4. Load font files for react-native-vector-icons

The Reader component from `common-app` automatically detects the web platform and adjusts its behavior accordingly (e.g., loading EPUBs directly from URLs instead of downloading them).

## Learn More

- [React Native Readium Documentation](../../README.md)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Native Web Documentation](https://necolas.github.io/react-native-web/)
- [Readium Documentation](https://readium.org/)
