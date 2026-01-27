# Common App - React Native Readium Example

A comprehensive example application demonstrating all features of the react-native-readium library, including reading EPUB publications, preferences management, table of contents navigation, and highlights/annotations.

## Features

### 📖 **EPUB Reading**

- Load and display EPUB publications
- Automatic file download for native platforms
- Web-based reading with direct URL access
- Support for initial location/bookmark

### 🎨 **Reader Preferences**

- Theme selection (light, dark, sepia)
- Font customization
- Text size and spacing adjustments
- Column layout options
- Publisher styles toggle
- And more...

### 📑 **Table of Contents**

- Navigate through chapters
- Hierarchical TOC display
- Quick jump to any section

### ✏️ **Highlights & Annotations** (NEW!)

- Add colorful highlights at any location
- Attach notes to highlights
- View, edit, and delete highlights
- Navigate to highlight locations
- Tap highlights to view notes
- 5 built-in highlight colors

## Getting Started

This app is shared between the example-native and example-nextjs apps, providing a common reader experience across platforms.

### Structure

```
common-app/
├── src/
│   ├── components/
│   │   ├── Reader.tsx              # Main reader component
│   │   ├── HighlightManager.tsx    # Highlights UI and management
│   │   ├── PreferencesEditor.tsx   # Reader settings
│   │   ├── TableOfContents.tsx     # TOC navigation
│   │   └── ReaderButton.tsx        # UI button component
│   └── utils/
│       └── RNFS.ts                 # File system utilities
├── HIGHLIGHTS_GUIDE.md             # Detailed highlights documentation
└── README.md                       # This file
```

## Using in Your App

### Basic Usage

```typescript
import { Reader } from 'common-app';

function App() {
  return (
    <Reader
      epubUrl="https://example.com/book.epub"
      epubPath="/local/path/to/book.epub" // Optional for native
      initialLocation={{
        href: '/chapter1.xhtml',
        type: 'application/xhtml+xml',
        locations: { progression: 0.5 },
      }}
    />
  );
}
```

### Highlights Feature

The Reader component now includes a built-in highlights system:

1. **Add Highlights**: Click the bookmark icon, choose a color, and add a highlight at your current location
2. **View Notes**: Tap on any highlighted text to see the note
3. **Manage Highlights**: Edit notes, navigate to highlights, or delete them from the highlights panel

See [HIGHLIGHTS_GUIDE.md](./HIGHLIGHTS_GUIDE.md) for detailed documentation.

## Components

### Reader

Main reader component that orchestrates all features.

**Props:**

- `epubUrl` (string): URL to the EPUB file
- `epubPath` (string, optional): Local file path for native platforms
- `initialLocation` (Locator, optional): Starting location in the book

**Features:**

- Automatic file download management
- Reader preferences
- Table of contents
- Highlights and annotations
- Location tracking
- Publication metadata

### HighlightManager

Modal component for managing highlights and annotations.

**Props:**

- `highlights`: Array of highlight decorations
- `currentLocation`: Current reader position
- `onAddHighlight`: Callback to add a new highlight
- `onDeleteHighlight`: Callback to delete a highlight
- `onUpdateHighlight`: Callback to update a highlight's note
- `onNavigateToHighlight`: Callback to navigate to a highlight

**Features:**

- Color selection (5 colors)
- Note editing
- Highlight list with search/filter
- Navigate to highlights
- Delete highlights

### PreferencesEditor

Modal for adjusting reader settings.

**Features:**

- Theme selection
- Font family and size
- Text alignment and spacing
- Column layout
- Scroll vs. paginated mode
- And 20+ more settings

### TableOfContents

Modal for navigating the book's structure.

**Features:**

- Hierarchical TOC display
- Quick chapter navigation
- Chapter titles and page numbers

## Customization

### Changing Highlight Colors

Edit `src/components/HighlightManager.tsx`:

```typescript
const HIGHLIGHT_COLORS = [
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Green', color: '#90EE90' },
  // Add your colors here
  { name: 'Purple', color: '#DDA0DD' },
];
```

### Persisting Highlights

Add storage integration to `src/components/Reader.tsx`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In Reader component
useEffect(() => {
  // Save highlights when they change
  AsyncStorage.setItem('book-highlights', JSON.stringify(decorations));
}, [decorations]);

useEffect(() => {
  // Load highlights on mount
  AsyncStorage.getItem('book-highlights').then((data) => {
    if (data) setDecorations(JSON.parse(data));
  });
}, []);
```

### Adding New Features

The Reader component is designed to be extensible:

1. Add new state variables
2. Create handler functions
3. Pass to ReadiumView via props
4. Update UI components as needed

Example - Adding bookmarks:

```typescript
const [bookmarks, setBookmarks] = useState<Locator[]>([]);

const addBookmark = () => {
  if (currentLocation) {
    setBookmarks([...bookmarks, currentLocation]);
  }
};

// Add BookmarkManager component to controls
<BookmarkManager
  bookmarks={bookmarks}
  onAdd={addBookmark}
  onNavigate={setLocation}
/>;
```

## Platform Support

### Native (iOS/Android)

- Full decoration API support
- Native alerts for highlight notes
- File system integration
- Offline reading

### Web

- Full decoration API support
- Browser alerts for highlight notes
- Direct URL loading
- Responsive design

## Development

### Running the Example

For native:

```bash
cd apps/example-native
yarn install
yarn ios # or yarn android
```

For web:

```bash
cd apps/example-nextjs
yarn install
yarn dev
```

### Testing Highlights

1. Open the app and load a book
2. Navigate to any page
3. Click the bookmark icon (top-right)
4. Add a note (optional)
5. Select a color to highlight
6. Tap on the highlighted text to see the note
7. Open the highlights panel to manage all highlights

## API Integration

The app uses the full react-native-readium API:

```typescript
import {
  ReadiumView,
  Decoration,
  DecorationGroups,
  DecorationActivatedEvent,
  Locator,
  Link,
  Preferences,
  PublicationReadyEvent,
} from 'react-native-readium';
```

See the main library documentation for complete API reference.

## Troubleshooting

### Highlights not appearing

- Ensure you're at a valid location
- Check console logs for errors
- Verify `currentLocation` is not null

### File download fails

- Check network connectivity
- Verify EPUB URL is accessible
- Check file system permissions on native

### Performance issues

- Consider pagination for large highlight lists
- Optimize re-renders with `useMemo` and `useCallback`
- Use virtualized lists for 100+ highlights

## Contributing

This common-app serves as the reference implementation for react-native-readium features. When adding new features to the library:

1. Add the feature to this app
2. Create a demo/example
3. Document usage
4. Test on all platforms (iOS, Android, Web)

## Resources

- [Main Library Documentation](../../README.md)
- [Highlights Guide](./HIGHLIGHTS_GUIDE.md)
- [Decorations API Design](../../DECORATION_API_DESIGN.md)
- [Decorations Examples](../../DECORATIONS_EXAMPLE.md)
- [Readium Documentation](https://readium.org)

## License

Same as the main react-native-readium library.
