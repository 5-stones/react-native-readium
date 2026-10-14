# PublicationErrorCode

```ts
type PublicationErrorCode = 
  | "fileNotFound"
  | "formatNotSupported"
  | "openFailed"
  | "protectionNotSupported"
  | "restricted"
  | "cancelled"
  | "readFailed";
```

What went wrong with a publication.
- `protectionNotSupported`: protected with a scheme no registered content protection handles.
- `restricted`: a protection matched but refused access, e.g. an expired license.
- `cancelled`: restricted with no error, e.g. the passphrase prompt was dismissed.
- `readFailed`: a read of an *open* publication failed and was not recovered. The
  only code that does not mean the publication failed to open; see the event's `stage`.
