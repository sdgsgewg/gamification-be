import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // 🔍 Tentukan path absolut ke file build
    const distPath = path.join(process.cwd(), 'dist');
    const mainPath = path.join(distPath, 'main.js');

    console.log('📁 Current working directory:', process.cwd());
    console.log(
      '📂 Files in dist:',
      fs.existsSync(distPath) ? fs.readdirSync(distPath) : '❌ dist not found',
    );

    // 🧠 Lazy import: supaya gak error kalau dist belum ada
    const { default: app } = await import(mainPath);

    // 🚀 Jalankan app NestJS (yang diekspor sebagai handler)
    return app(req, res);
  } catch (err) {
    console.error('❌ Error running NestJS app:', err);
    res.status(500).send('NestJS app failed to load or dist not found.');
  }
}
