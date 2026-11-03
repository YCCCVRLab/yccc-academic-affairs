import { mkdir, readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUTPUT = new URL('backend/firebase/site-content.json', ROOT);
const CONFIG = new URL('supabase-config.js', ROOT);

const configText = await readFile(CONFIG, 'utf8');
const supabaseUrl = process.env.SUPABASE_URL || configText.match(/url:\s*'([^']+)'/)?.[1];
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || configText.match(/publishableKey:\s*'([^']+)'/)?.[1];

if (!supabaseUrl || !publishableKey) {
  throw new Error('Could not read the public Supabase URL and publishable key.');
}

const restBase = new URL('/rest/v1/', supabaseUrl);
const headers = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
  Accept: 'application/json'
};

async function getRows(table, params) {
  const url = new URL(table, restBase);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`${table} returned HTTP ${response.status}: ${detail}`);
  }
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error(`${table} did not return an array.`);
  return rows;
}

try {
  const [pages, settingsRows, announcements] = await Promise.all([
    getRows('aa_site_pages', {
      select: '*',
      published: 'eq.true',
      order: 'page_order.asc,title.asc'
    }),
    getRows('aa_site_settings', {
      select: '*',
      singleton: 'eq.true',
      limit: '1'
    }),
    getRows('aa_site_announcements', {
      select: 'id,title,summary,body,url,severity,created_at',
      published: 'eq.true',
      order: 'created_at.desc',
      limit: '30'
    })
  ]);

  if (!pages.length) throw new Error('Supabase returned no published pages; refusing to overwrite the backup.');

  const backup = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    source: new URL(supabaseUrl).host,
    pages,
    settings: settingsRows[0] || null,
    announcements
  };

  await mkdir(new URL('./', OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

  console.log(`Exported ${pages.length} page(s), ${settingsRows.length} settings row(s), and ${announcements.length} announcement(s) to ${OUTPUT.pathname}.`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
