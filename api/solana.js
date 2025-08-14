export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { addresses } =
      typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      res.status(400).json({ error: 'Missing addresses' });
      return;
    }

    const target = 'https://s.1b.tc/888/solana';

    // 直连 s.1b.tc：模拟你抓包时的请求头（Origin/Referer/UA 等）
    const headers = {
      'Content-Type': 'application/json',
      'Origin': 'https://ct.app',
      'Referer': 'https://ct.app/',
      'solana-client': 'js/1.0.0-maintenance',
      'User-Agent': 'Mozilla/5.0'
    };

    const body = JSON.stringify({ addresses });

    const resp = await fetch(target, { method: 'POST', headers, body });

    // s.1b.tc 一般会返回 200；若非 2xx，直接报错
    if (!resp.ok) {
      const txt = await resp.text().catch(()=> '');
      res.status(resp.status).json({ error: 'Upstream error', detail: txt });
      return;
    }

    const text = await resp.text();
    let json;
    try { json = JSON.parse(text); } catch {
      res.status(502).json({ error: 'Invalid JSON from upstream', raw: text });
      return;
    }

    // ---- 解析为 { address: lamports } 的映射 ----
    function normalize(raw) {
      if (!raw) return null;

      // 1) 常见包装：{ balances: { addr: lamports, ... } }
      const inner = raw.balances || raw.result || raw.data || raw;
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        // 直接是映射
        if (Object.values(inner).every(v => typeof v === 'number' || (v && typeof v === 'object'))) {
          const out = {};
          for (const [k,v] of Object.entries(inner)) {
            if (typeof v === 'number') out[k] = v;
            else if (v && typeof v === 'object') {
              if (typeof v.lamports !== 'undefined') out[k] = Number(v.lamports||0);
              else if (typeof v.balance !== 'undefined') out[k] = Number(v.balance||0);
              else if (typeof v.value !== 'undefined') out[k] = Number(v.value||0);
            }
          }
          if (Object.keys(out).length) return out;
        }
      }

      // 2) 数组形式：[{address, lamports}] 或 [{address, balance/value}]
      if (Array.isArray(raw)) {
        const out = {};
        for (const it of raw) {
          const addr = it?.address;
          const val = it?.lamports ?? it?.balance ?? it?.value;
          if (addr && typeof val !== 'undefined') out[addr] = Number(val||0);
        }
        if (Object.keys(out).length) return out;
      }

      return null;
    }

    const balances = normalize(json);
    if (!balances) {
      res.status(502).json({ error: 'Unrecognized upstream shape', upstream: json });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ ok: true, balances, via: 's.1b.tc' });
  } catch (e) {
    res.status(500).json({ error: 'Server Error', detail: String(e) });
  }
}
