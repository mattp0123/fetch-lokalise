## What is this

This is a simple helper for me to download and format translations from Lokalise.

- ESModule supported

## How to use

```typescript
import fetchLokalise from 'fetch-lokalise';

await fetchLokalise({
  // Required
  projectId: 'your-lokalise-project-id',
  token: 'your-lokalise-api-token',
  outDir: 'path/to/your/locale',

  // Optional
  tags: ['tag_1', 'tag_2'],
});
```
