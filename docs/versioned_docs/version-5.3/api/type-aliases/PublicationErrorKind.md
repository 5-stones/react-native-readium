# PublicationErrorKind

```ts
type PublicationErrorKind = "http" | "unreadable";
```

For a read failure, whether a status was readable at all. `'unreadable'`
covers a host that omits CORS headers from its errors, which withholds the
status from a web reader; native always has one.
