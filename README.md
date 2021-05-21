## What is this

This is a simple helper for me to download translations from Lokalise.

## How to use

```typescript
import fetchLokalise from 'fetch-lokalise';

await fetchLokalise({
  projectId: 'your-lokalise-project-id',
  token: 'your-lokalise-api-token',
  outDir: 'path/to/your/locale',
});
```
