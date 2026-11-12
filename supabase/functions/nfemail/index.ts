// Boto Fé · Função "nfemail" (Supabase Edge Function)
// Faz a ponte entre o sistema e a API do NFeMail.
// A chave do NFeMail fica no banco (esquema privado, só Gestão) ou no segredo NFEMAIL_KEY; nunca no site nem no GitHub. O CNPJ já vem preenchido.
// Só usuários logados com papel "gestao" podem usar. Só os caminhos da lista ALLOW são aceitos.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const ALLOW: [string, string][] = [
  ["GET", "api/Produtos"], ["GET", "api/Clientes"], ["GET", "api/NotasFiscais"],
  ["GET", "api/DANFe"], ["GET", "api/ArquivoXML"], ["POST", "api/NotasFiscais"],
];
const json = (o: unknown, st = 200) =>
  new Response(JSON.stringify(o), { status: st, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "Use POST" }, 405);
  try {
    const SB = Deno.env.get("SUPABASE_URL")!;
    const AK = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const auth = req.headers.get("Authorization") ?? "";
    // 1) quem está chamando?
    const u = await fetch(SB + "/auth/v1/user", { headers: { apikey: AK, Authorization: auth } });
    if (!u.ok) return json({ erro: "Sessão inválida. Entre de novo no sistema." }, 401);
    const user = await u.json();
    // 2) tem papel de gestão?
    const p = await fetch(SB + "/rest/v1/perfis?select=papel&id=eq." + user.id, { headers: { apikey: AK, Authorization: auth } });
    const pr = p.ok ? await p.json() : [];
    if (!pr.length || pr[0].papel !== "gestao") return json({ erro: "Só a Gestão pode usar a integração." }, 403);
    // 3) chamada permitida?
    const { method = "GET", path = "", query = {}, body = null } = await req.json();
    const m = String(method).toUpperCase(), pa = String(path).replace(/^\/+/, "");
    if (!ALLOW.some(([a, b]) => a === m && b.toLowerCase() === pa.toLowerCase())) return json({ erro: "Chamada não permitida: " + m + " " + pa }, 400);
    const CNPJ = (Deno.env.get("NFEMAIL_CNPJ") ?? "41134556000158").replace(/\D/g, "");   // CNPJ da Botofé (público)
    // chave: segredo NFEMAIL_KEY ou, se não houver, a chave salva pela tela Financeiro → Nota fiscal (esquema privado do banco)
    let KEY = Deno.env.get("NFEMAIL_KEY") ?? "";
    if (!KEY) {
      const kr = await fetch(SB + "/rest/v1/rpc/ler_chave_nfemail", { method: "POST", headers: { apikey: AK, Authorization: auth, "Content-Type": "application/json" }, body: "{}" });
      KEY = kr.ok ? String((await kr.json()) ?? "") : "";
    }
    if (!KEY) return json({ erro: "A chave do NFeMail ainda não foi salva. Use o campo \"Chave de API do NFeMail\" nesta tela." }, 500);
    const base = Deno.env.get("NFEMAIL_URL") ?? "https://api.nfemail.com.br/";
    const url = new URL(pa, base.endsWith("/") ? base : base + "/");
    for (const [k, v] of Object.entries(query ?? {})) if (v !== null && v !== undefined && v !== "") url.searchParams.set(k, String(v));
    // 4) chama o NFeMail
    const r = await fetch(url, {
      method: m,
      headers: { Authorization: "Basic " + btoa(CNPJ + ":" + KEY), Accept: "application/json, application/pdf, application/xml, text/plain, */*", ...(body != null ? { "Content-Type": "text/plain; charset=utf-8" } : {}) },
      body: body != null ? String(body) : undefined,
    });
    const ct = r.headers.get("content-type") ?? "";
    if (/pdf|octet-stream|zip/i.test(ct)) {
      const b = new Uint8Array(await r.arrayBuffer());
      let s = ""; for (let i = 0; i < b.length; i += 32768) s += String.fromCharCode(...b.subarray(i, i + 32768));
      return json({ status: r.status, tipo: ct, base64: btoa(s) });
    }
    const t = await r.text();
    let d: unknown = null; try { d = JSON.parse(t); } catch { /* texto/XML */ }
    return json({ status: r.status, tipo: ct, dados: d, texto: d === null ? t.slice(0, 200000) : undefined });
  } catch (e) {
    return json({ erro: "Falha na função: " + (e instanceof Error ? e.message : String(e)) }, 500);
  }
});
