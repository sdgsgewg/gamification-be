// // api/index.js
// /* eslint-disable @typescript-eslint/no-require-imports */
// const path = require('path');

// module.exports = async (req, res) => {
//   try {
//     const appPath = path.join(__dirname, '../dist/main.js');
//     const { default: app } = await import(appPath);
//     return app(req, res);
//   } catch (err) {
//     console.error('Error loading NestJS app:', err);
//     res.status(500).send('NestJS app not built or failed to load.');
//   }
// };

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    const appPath = path.join(__dirname, '../dist/main.js');
    const { default: app } = await import(appPath);
    return app(req, res);
  } catch (err) {
    console.error('Error loading NestJS app:', err);
    res.status(500).send('NestJS app not built or failed to load.');
  }
}
