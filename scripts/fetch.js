// Fetches pilotage lists from Kıyı Emniyeti and writes list.json for GitHub Pages
import fs from 'node:fs/promises';

const KE_URL = 'https://www.kiyiemniyeti.gov.tr/gemi_trafik_bilgi_sistemleri';

async function fetchReady(direction) {
  // Movement: 'YG' = Geçişe Hazır, 'YP' = Planlı
  const params = new URLSearchParams({ Strait: 'I', Direction: direction, Movement: 'YG', submitted: '1' }).toString();
  const r = await fetch(KE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
    body: params,
  });
  const html = await r.text();
  const rows = parseHTMLTable(html);
  return formatRows(rows);
}

function parseHTMLTable(html) {
  const tableStart = html.indexOf('<table class="table no-margin table-striped filterable dataTable">');
  if (tableStart === -1) return [];
  const tableEnd = html.indexOf('</table>', tableStart) + 8;
  const tableHtml = html.substring(tableStart, tableEnd);
  const trMatches = tableHtml.match(/<tr>.*?<\/tr>/gs) || [];
  return trMatches
    .filter((row) => row.includes('<td'))
    .map((row) => (row.match(/<td.*?>(.*?)<\/td>/gs) || []).map((cell) => stripHtml(cell)));
}

function stripHtml(s) { return (s || '').replace(/<[^>]+>/g, '').trim(); }

function formatRows(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((row) => ({
    planlama: decodeHtmlEntities(row[1] || ''),
    gemiAdi: row[2] || '',
    boy: safeParseFloat(row[3]),
    kilavuz: ((row[5] || '').toLowerCase().includes('evet')),
  }));
}

function decodeHtmlEntities(text) {
  const entities = { '&#199;': 'Ç', '&#231;': 'ç', '&#286;': 'Ğ', '&#287;': 'ğ', '&#304;': 'İ', '&#305;': 'ı', '&#214;': 'Ö', '&#246;': 'ö', '&#350;': 'Ş', '&#351;': 'ş', '&#220;': 'Ü', '&#252;': 'ü' };
  return String(text || '').replace(/&#?\w+;/g, (m) => entities[m] || m);
}

function safeParseFloat(v) {
  const n = parseFloat(String(v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

async function main() {
  try {
    const [ns, sn] = await Promise.all([fetchReady('NS'), fetchReady('SN')]);
    const kuzeyden = (ns || [])
      .filter((r) => r.kilavuz)
      .map((r) => ({ gemiAdi: r.gemiAdi, boy: r.boy, planlama: r.planlama }))
      .filter((r) => r.gemiAdi);
    const guneyden = (sn || [])
      .filter((r) => r.kilavuz)
      .map((r) => ({ gemiAdi: r.gemiAdi, boy: r.boy, planlama: r.planlama }))
      .filter((r) => r.gemiAdi);
    const out = { kuzeyden, guneyden, lastUpdate: new Date().toISOString() };
    await fs.writeFile(new URL('../list.json', import.meta.url), JSON.stringify(out, null, 2), 'utf8');
    console.log('list.json yazıldı:', out);
  } catch (e) {
    const out = { kuzeyden: [], guneyden: [], lastUpdate: new Date().toISOString(), error: String(e?.message || e) };
    await fs.writeFile(new URL('../list.json', import.meta.url), JSON.stringify(out, null, 2), 'utf8');
    console.error('Hata, boş liste yazıldı:', e);
    process.exitCode = 1;
  }
}

await main();
