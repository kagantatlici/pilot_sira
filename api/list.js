// Vercel Serverless Function: Returns planned pilotage lists

const KE_URL = "https://www.kiyiemniyeti.gov.tr/gemi_trafik_bilgi_sistemleri";

export default async function handler(req, res) {
  // CORS (allow public read)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const [ns, sn] = await Promise.all([
      fetchPlanned("NS"), // Kuzey->Güney
      fetchPlanned("SN")  // Güney->Kuzey
    ]);
    // En sondaki plan saatlerini (pilot filtresi olmadan) çıkar
    const lastNsPlan = (ns && ns.length ? ns[ns.length - 1]?.planlama : null) || null;
    const lastSnPlan = (sn && sn.length ? sn[sn.length - 1]?.planlama : null) || null;
    // Planlı geçişteki tüm gemileri döndür, ancak kimin kılavuz aldığı bilgisini de ilet
    const kuzeyden = (ns || [])
      .map((s) => ({
        gemiAdi: s.gemiAdi,
        boy: s.boy,
        planlama: s.planlama,
        gemiTipi: s.gemiTipi,
        kilavuz: !!s.kilavuz
      }))
      .filter((s) => s.gemiAdi);
    const guneyden = (sn || [])
      .map((s) => ({
        gemiAdi: s.gemiAdi,
        boy: s.boy,
        planlama: s.planlama,
        gemiTipi: s.gemiTipi,
        kilavuz: !!s.kilavuz
      }))
      .filter((s) => s.gemiAdi);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).json({
      kuzeyden,
      guneyden,
      olasiGuneyAcilisPlan: lastNsPlan,
      olasiKuzeyAcilisPlan: lastSnPlan,
      lastUpdate: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}

async function fetchPlanned(direction /* 'NS' | 'SN' */) {
  const params = new URLSearchParams({
    Strait: "I",
    Direction: direction,
    Movement: "YP",
    submitted: "1"
  }).toString();

  const r = await fetch(KE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0"
    },
    body: params
  });
  const html = await r.text();
  const rows = parseHTMLTable(html);
  return formatRows(rows);
}

function filterPilotlu(list) {
  return (list || []).filter((row) => row.kilavuz);
}

function parseHTMLTable(html) {
  const tableStart = html.indexOf('<table class="table no-margin table-striped filterable dataTable">');
  if (tableStart === -1) return [];
  const tableEnd = html.indexOf("</table>", tableStart) + 8;
  const tableHtml = html.substring(tableStart, tableEnd);
  const trMatches = tableHtml.match(/<tr>.*?<\/tr>/gs) || [];
  return trMatches
    .filter((row) => row.includes("<td"))
    .map((row) => (row.match(/<td.*?>(.*?)<\/td>/gs) || []).map((cell) => stripHtml(cell)));
}

function stripHtml(s) {
  return (s || "").replace(/<[^>]+>/g, "").trim();
}

function formatRows(rows) {
  if (!rows || rows.length === 0) return [];
  return rows.map((row) => ({
    planlama: decodeHtmlEntities(row[1] || ""),
    gemiAdi: row[2] || "",
    boy: safeParseFloat(row[3]),
    gemiTipi: row[4] || "",
    kilavuz: ((row[5] || "").toLowerCase().includes("evet")),
    romorkor: ((row[6] || "").toLowerCase().includes("evet")),
    sp2: row[7] || "",
    sp1: row[8] || ""
  }));
}

function safeParseFloat(v) {
  const n = parseFloat(String(v || "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function decodeHtmlEntities(text) {
  const entities = {
    "&#199;": "Ç",
    "&#231;": "ç",
    "&#286;": "Ğ",
    "&#287;": "ğ",
    "&#304;": "İ",
    "&#305;": "ı",
    "&#214;": "Ö",
    "&#246;": "ö",
    "&#350;": "Ş",
    "&#351;": "ş",
    "&#220;": "Ü",
    "&#252;": "ü"
  };
  return String(text || "").replace(/&#?\w+;/g, (m) => entities[m] || m);
}
