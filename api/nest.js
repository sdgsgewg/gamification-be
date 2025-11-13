// api/nest.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    const distPath = path.join(process.cwd(), 'dist');
    const mainPath = path.join(distPath, 'main.js');

    if (!fs.existsSync(mainPath)) {
      console.error('❌ dist/main.js not found. Did you run `npm run build`?');
      return res
        .status(500)
        .send('Server build not found. Please redeploy after building.');
    }

    const { default: nestHandler } = await import(mainPath);
    return nestHandler(req, res);
  } catch (err) {
    console.error('❌ Failed to load NestJS app:', err);
    res.status(500).send('Internal Server Error');
  }
}
