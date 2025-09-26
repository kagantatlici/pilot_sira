Amaç
- Kıyı Emniyeti (İstanbul Boğazı) sitesinden planlı geçişleri çeker.
- Sadece kılavuz kaptan alacak gemileri listeler ve numaralandırır.
- Web arayüzü: `index.html` (önce `/api/list`, olmazsa `list.json`).

Dağıtım (Vercel)
1) GitHub repo zaten hazır: `kagantatlici/pilot_sira`
2) https://vercel.com/new ile GitHub hesabınızı bağlayın ve bu repoyu import edin.
3) Ek ayar gerekmiyor. `api/list.js` Vercel Function olarak çalışır, `index.html` statik sunulur.
4) Deploy sonrası URL'de sayfa otomatik olarak `/api/list`'ten veriyi çeker.

Yerel Geliştirme (isteğe bağlı)
- `npm i -g vercel` ardından `vercel login`
- `vercel dev` ile yerel geliştirme, `vercel --prod` ile üretim deploy.

Notlar
- Kaynak: https://www.kiyiemniyeti.gov.tr/gemi_trafik_bilgi_sistemleri (POST: `Strait=I`, `Movement=YG|YP`, `Direction=NS|SN`).
- `api/list.js` ve `scripts/fetch.js` gelen HTML tabloyu parse eder; “Kılavuz” hücresi "evet" ise dahil edilir.
- Arayüz, her satırı şu formatta numaralandırır: `1- geçiş tarih saati - gemi adı - gemi boyu`.
- Sayfa başlığı: “Sadece Pilot Alan Gemi Sıralaması”.
