import { LokaliseApi } from '@lokalise/node-api';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import yauzl from 'yauzl';

type Params = {
  projectId: string;
  token: string;
  outDir: string;
};

export default async function fetchLokalise({
  projectId,
  token,
  outDir,
}: Params) {
  if (outDir === undefined || projectId === undefined || token === undefined) {
    throw new Error('Params not provided');
  }

  if (fs.existsSync(outDir) === false) {
    fs.mkdirSync(outDir);
  }

  const bundleStructure = '%LANG_ISO%.%FORMAT%';
  const zipFilePath = path.resolve(outDir, 'files.zip');
  const targetPath = outDir;

  console.log('fetching translations...');
  const lokaliseApi = new LokaliseApi({ apiKey: token });

  const { bundle_url: downloadUrl } = await lokaliseApi.files.download(
    projectId,
    {
      format: 'json',
      original_filenames: false,
      bundle_structure: bundleStructure,
      all_platforms: true,
      // filter_langs,
    }
  );

  const { data } = await axios({
    method: 'GET',
    url: downloadUrl,
    responseType: 'arraybuffer',
  });

  fs.writeFileSync(zipFilePath, data);
  fs.mkdirSync(targetPath, { recursive: true });

  await new Promise((resolve) => {
    yauzl.open(zipFilePath, (error, zipFile) => {
      if (error) {
        throw error;
      }

      if (zipFile === undefined) {
        throw new Error('empty zip');
      }

      zipFile.on('entry', (entry: yauzl.Entry) => {
        zipFile.openReadStream(entry, (error, stream) => {
          if (error) {
            throw error;
          }

          if (entry.fileName === './') {
            return;
          }

          if (stream === undefined) {
            return;
          }

          stream.pipe(
            fs.createWriteStream(path.resolve(targetPath, entry.fileName))
          );
        });
      });

      zipFile.on('end', resolve);
    });
  });

  fs.unlinkSync(zipFilePath);
  console.log('done.');
}
