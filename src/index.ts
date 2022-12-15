import got from 'got';
import fs from 'node:fs';
import path from 'node:path';
import type { LangToTranslationsMap, ListKeysResponse } from './types.js';

interface Params {
  projectId: string;
  token: string;
  outDir: string;
  tags?: string[];
}

export default async function fetchLokalise({
  projectId,
  token,
  outDir,
  tags,
}: Params) {
  if (!outDir || !projectId || !token) {
    throw new Error('Params not provided');
  }

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir);

  const keys = await got.paginate.all(
    `https://api.lokalise.com/api2/projects/${projectId}/keys`,
    {
      headers: { 'x-api-token': token },
      searchParams: {
        page: 1,
        limit: 50,
        include_translations: '1',
        ...(tags && { filter_tags: tags.join(',') }),
      },
      pagination: {
        transform: (res) =>
          (JSON.parse(res.body as string) as ListKeysResponse).keys,
        // Rate limit: 6 reqs/sec
        backoff: 167,
        paginate: ({ response }) => {
          const currentPage = parseInt(
            response.requestUrl.searchParams.get('page')!,
          );
          const pageCount = parseInt(
            response.headers['x-pagination-page-count'] as string,
          );
          const hasNextPage = currentPage < pageCount;
          return hasNextPage && { searchParams: { page: currentPage + 1 } };
        },
      },
    },
  );
  const flattendKeys = keys.flatMap(({ key_name, translations }) => {
    const { web: keyName } = key_name;
    return translations.map(({ translation, language_iso }) => ({
      lang: language_iso,
      keyName,
      translation,
    }));
  });
  const langToTranslationsMap = flattendKeys.reduce<LangToTranslationsMap>(
    (map, { keyName, lang, translation }) => {
      if (lang in map) {
        map[lang][keyName] = translation;
      } else {
        map[lang] = { [keyName]: translation };
      }
      return map;
    },
    {},
  );
  const tasksWriteFile = Object.entries(langToTranslationsMap).map(
    ([lang, keyTransMap]) =>
      fs.promises.writeFile(
        path.join(outDir, `${lang}.json`),
        JSON.stringify(keyTransMap),
      ),
  );
  await Promise.all(tasksWriteFile);
}
