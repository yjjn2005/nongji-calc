// nongji-calc-api — PIN 기반 기기 간 동기화 (Cloudflare Worker + KV)
// KV 네임스페이스 바인딩 이름: NONGJI_SYNC
export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(req.url);
    const m = url.pathname.match(/^\/sync\/([A-Za-z0-9_-]{4,64})$/);
    if (!m) return new Response("not found", { status: 404, headers: cors });
    const key = "pin:" + m[1];

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
  },
};
