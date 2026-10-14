# Locator

A location in a publication, as Readium describes it: reading positions, bookmarks,
highlights and search results are all locators. Store them as they are to reopen there later.

## Properties

### href

```ts
href: string;
```

The resource (e.g. a chapter's file) within the publication.

***

### type

```ts
type: string;
```

The resource's media type.

***

### target?

```ts
optional target?: number;
```

***

### title?

```ts
optional title?: string;
```

***

### locations?

```ts
optional locations?: LocatorLocations;
```

***

### text?

```ts
optional text?: LocatorText;
```
