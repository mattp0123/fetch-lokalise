import { LokaliseApi } from '@lokalise/node-api';
import axios from 'axios';
import { createWriteStream, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import yauzl from 'yauzl';

type Params = {
  projectId: string;
  token: string;
  outDir: string;
};

export default function fetchLokalise({ projectId, token, outDir }: Params) {
  if (outDir === undefined || projectId === undefined || token === undefined) {
    throw 'Params not provided';
  }

  const bundleStructure = '%LANG_ISO%.%FORMAT%';
  const zipFilePath = path.resolve(__dirname, 'files.zip');
  const targetPath = outDir;

  (async () => {
    console.log('fetching translations...');
    const lokaliseApi = new LokaliseApi({ apiKey: token });

    const { bundle_url: downloadUrl } = await lokaliseApi.files.download(
      projectId,
      {
        format: 'json',
        original_filenames: false,
        bundle_structure: bundleStructure,
        // filter_langs,
      }
    );

    const { data } = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'arraybuffer',
    });

    writeFileSync(zipFilePath, data);
    mkdirSync(targetPath, { recursive: true });

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
              createWriteStream(path.resolve(targetPath, entry.fileName))
            );
          });
        });

        zipFile.on('end', resolve);
      });
    });

    unlinkSync(zipFilePath);
    console.log('done.');
  })();
}
