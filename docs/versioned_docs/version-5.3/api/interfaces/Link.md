# Link

An interface representing the Readium Link object.
Extends the Nitro spec Link with an optional properties bag
and supports hierarchical TOC via nested children.

## Extends

- `Omit`\<`SpecLink`, `"depth"` \| `"hasChildren"` \| `"parentHref"` \| `"position"`\>

## Properties

### type?

```ts
optional type?: string;
```

The linked resource's media type, when known; the web reader sets it.

***

### properties?

```ts
optional properties?: any;
```

***

### children?

```ts
optional children?: Link[];
```

***

### href

```ts
href: string;
```

#### Inherited from

```ts
Omit.href
```

***

### title?

```ts
optional title?: string;
```

#### Inherited from

```ts
Omit.title
```

***

### rels?

```ts
optional rels?: string[];
```

#### Inherited from

```ts
Omit.rels
```

***

### languages?

```ts
optional languages?: string[];
```

#### Inherited from

```ts
Omit.languages
```
