# PublicationReadyEvent

## Extends

- `Omit`\<`SpecPublicationReadyEvent`, `"tableOfContents"` \| `"metadata"`\>

## Properties

### metadata

```ts
metadata: PublicationMetadata;
```

***

### tableOfContents

```ts
tableOfContents: Link[];
```

***

### capabilities

```ts
capabilities: Capabilities;
```

Which preferences and features apply to this publication.

#### Overrides

```ts
Omit.capabilities
```

***

### positions

```ts
positions: Locator[];
```

One locator per position in the publication, e.g. for a page slider.

#### Inherited from

```ts
Omit.positions
```

***

### isProtected

```ts
isProtected: boolean;
```

True when a registered content protection unlocked this publication.

#### Inherited from

```ts
Omit.isProtected
```

***

### protectionScheme?

```ts
optional protectionScheme?: string;
```

The protection's scheme URI, e.g. `http://readium.org/2014/01/lcp`.

#### Inherited from

```ts
Omit.protectionScheme
```
