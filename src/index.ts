import axios from 'axios';
import Bottleneck from 'bottleneck';
import fs from 'node:fs';
import path from 'node:path';
import type { Key, LangToTranslationsMap, ListKeysResponse } from './types';

interface Params {
  projectId: string;
  token: string;
  outDir: string;
  tags?: string[];
}

async function listKeys({
  projectId,
  token,
  page,
  tags,
}: Omit<Params, 'outDir'> & { page: number }) {
  const { data, headers } = await axios.get<ListKeysResponse>(
    `https://api.lokalise.com/api2/projects/${projectId}/keys`,
    {
      headers: { 'x-api-token': token },
      params: {
        page,
        limit: 100,
        include_translations: '1',
        ...(tags && { filter_tags: tags.join(',') }),
      },
    },
  );
  const pageCount = parseInt(headers['x-pagination-page-count']);
  return [data.keys, pageCount] as const;
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

  // Rate limit: 6 reqs/sec
  const limiter = new Bottleneck({ minTime: 167 });
  const tasks: Promise<readonly [Key[], number]>[] = [];
  let page = 1;
  let [keys, pageCount] = await limiter.schedule(() =>
    listKeys({ projectId, token, tags, page }),
  );
  while (page < pageCount) {
    page += 1;
    tasks.push(
      limiter.schedule(() => listKeys({ projectId, token, page, tags })),
    );
  }
  const keysToPageCountTuples = await Promise.all(tasks);
  keysToPageCountTuples.forEach(([newKeys]) => {
    keys = keys.concat(newKeys);
  });
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
