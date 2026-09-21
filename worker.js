// nongji-calc-api — PIN 기반 기기 간 동기화 + 토지이용규제 조회 프록시 (Cloudflare Worker + KV)
// KV 네임스페이스 바인딩 이름: NONGJI_SYNC
// MOLIT_KEY는 Cloudflare 대시보드에서 Settings > Variables > Secret으로 옮기는 것을 권장합니다 (wrangler secret put MOLIT_KEY)

const MOLIT_KEY = "2b71f243d1071c478f4d8d0ebcd6c0f494195d0eb2063b24b154238c5b398e3b";
const MOLIT_BASE = "https://apis.data.go.kr/1613000/arLandUseInfoService";
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept": "application/xml",
};

function xmlToJson(xmlText) {
  const items = [];
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const block of itemBlocks) {
    const obj = {};
    const fieldMatches = block.matchAll(/<(\w+)>([^<]*)<\/\1>/g);
    for (const m of fieldMatches) obj[m[1]] = m[2];
    items.push(obj);
  }
  const resultCode = (xmlText.match(/<resultCode>([^<]*)<\/resultCode>/) || [])[1];
  const resultMsg = (xmlText.match(/<resultMsg>([^<]*)<\/resultMsg>/) || [])[1];
  const totalCount = (xmlText.match(/<totalCount>([^<]*)<\/totalCount>/) || [])[1];
  return { resultCode, resultMsg, totalCount, items };
}

async function callMolit(operation, params) {
  const url = new URL(`${MOLIT_BASE}/${operation}`);
  url.searchParams.set("serviceKey", MOLIT_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: BROWSER_HEADERS });
  const buf = await res.arrayBuffer();
  const text = new TextDecoder("euc-kr").decode(buf);
  return xmlToJson(text);
}

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(req.url);

    // ---- 기존: PIN 기반 기기 간 동기화 ----
    const syncMatch = url.pathname.match(/^\/sync\/([A-Za-z0-9_-]{4,64})$/);
    if (syncMatch) {
      const key = "pin:" + syncMatch[1];
      if (req.method === "GET") {
        const v = await env.NONGJI_SYNC.get(key);
        if (!v) return new Response("no data", { status: 404, headers: cors });
        return new Response(v, { headers: { ...cors, "Content-Type": "application/json" } });
      }
      if (req.method === "PUT") {
        const body = await req.text();
        if (body.length > 100_000) return new Response("too large", { status: 413, headers: cors });
        try { JSON.parse(body); } catch { return new Response("bad json", { status: 400, headers: cors }); }
        await env.NONGJI_SYNC.put(key, body, { expirationTtl: 60 * 60 * 24 * 365 });
        return new Response('{"ok":true}', { headers: { ...cors, "Content-Type": "application/json" } });
      }
      return new Response("method not allowed", { status: 405, headers: cors });
    }

    // ---- 신규: 토지이용규제 조회 프록시 ----
    if (url.pathname === "/landuse/search-act") {
      try {
        const landUseNm = url.searchParams.get("landUseNm") || "";
        const pageNum = url.searchParams.get("pageNum") || "1";
        const numOfRows = url.searchParams.get("numOfRows") || "20";
        const data = await callMolit("DTsearchLunCd", { landUseNm, pageNum, numOfRows });
        return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (url.pathname === "/landuse/restriction") {
      try {
        const areaCd = url.searchParams.get("areaCd") || "";
        const ucodeList = url.searchParams.get("ucodeList") || "";
        const landUseNm = url.searchParams.get("landUseNm") || "";
        const data = await callMolit("DTarLandUseInfo", { areaCd, ucodeList, landUseNm });
        return new Response(JSON.stringify(data), { headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    return new Response("not found", { status: 404, headers: cors });
  },
};
