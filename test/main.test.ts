import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';
import fetchLokalise from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

test('Fetch keys from Lokalise', async () => {
  await fetchLokalise({
    projectId: process.env.LOKALISE_PROJECT_ID!,
    token: process.env.LOKALISE_API_TOKEN!,
    outDir: path.resolve(__dirname, '../locales'),
    tags: ['webapp'],
  });
});
