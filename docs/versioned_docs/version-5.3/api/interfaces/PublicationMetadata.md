# PublicationMetadata

Publication metadata following Readium Web Publication Manifest spec.
Extends the Nitro spec metadata with the `@type` field.

## See

https://readium.org/webpub-manifest/

## Extends

- `PublicationMetadata`

## Properties

### @type?

```ts
optional @type?: string;
```

Type of publication (e.g., "http://schema.org/Book")

***

### title

```ts
title: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.title
```

***

### sortAs?

```ts
optional sortAs?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.sortAs
```

***

### subtitle?

```ts
optional subtitle?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.subtitle
```

***

### identifier?

```ts
optional identifier?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.identifier
```

***

### conformsTo?

```ts
optional conformsTo?: string[];
```

#### Inherited from

```ts
SpecPublicationMetadata.conformsTo
```

***

### accessibility?

```ts
optional accessibility?: Accessibility;
```

#### Inherited from

```ts
SpecPublicationMetadata.accessibility
```

***

### modified?

```ts
optional modified?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.modified
```

***

### published?

```ts
optional published?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.published
```

***

### language?

```ts
optional language?: string[];
```

#### Inherited from

```ts
SpecPublicationMetadata.language
```

***

### author?

```ts
optional author?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.author
```

***

### translator?

```ts
optional translator?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.translator
```

***

### editor?

```ts
optional editor?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.editor
```

***

### artist?

```ts
optional artist?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.artist
```

***

### illustrator?

```ts
optional illustrator?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.illustrator
```

***

### letterer?

```ts
optional letterer?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.letterer
```

***

### penciler?

```ts
optional penciler?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.penciler
```

***

### colorist?

```ts
optional colorist?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.colorist
```

***

### inker?

```ts
optional inker?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.inker
```

***

### narrator?

```ts
optional narrator?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.narrator
```

***

### contributor?

```ts
optional contributor?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.contributor
```

***

### publisher?

```ts
optional publisher?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.publisher
```

***

### imprint?

```ts
optional imprint?: Contributor[];
```

#### Inherited from

```ts
SpecPublicationMetadata.imprint
```

***

### subject?

```ts
optional subject?: Subject[];
```

#### Inherited from

```ts
SpecPublicationMetadata.subject
```

***

### layout?

```ts
optional layout?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.layout
```

***

### readingProgression?

```ts
optional readingProgression?: string;
```

The publication's own reading progression, as the publication declares it:
`ltr`, `rtl`, `ttb`, `btt` or `auto`. Not the preference of the same name,
which a reader sets and which takes only `ltr` or `rtl`.

#### Inherited from

```ts
SpecPublicationMetadata.readingProgression
```

***

### description?

```ts
optional description?: string;
```

#### Inherited from

```ts
SpecPublicationMetadata.description
```

***

### duration?

```ts
optional duration?: number;
```

#### Inherited from

```ts
SpecPublicationMetadata.duration
```

***

### numberOfPages?

```ts
optional numberOfPages?: number;
```

#### Inherited from

```ts
SpecPublicationMetadata.numberOfPages
```

***

### belongsTo?

```ts
optional belongsTo?: BelongsTo;
```

#### Inherited from

```ts
SpecPublicationMetadata.belongsTo
```
