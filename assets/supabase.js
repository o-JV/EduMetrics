/* ============================================================
   EduMetrics — cliente Supabase (sem SDK, via REST)
   Carregado ANTES de data.js e activities.js.
   ============================================================ */

const SUPABASE_URL  = "https://vzpxrypdtpatdzzfjoxk.supabase.co";
const SUPABASE_ANON = "sb_publishable_hqlk95UKiovhUy22ekwrsQ_-mNRZwxF";

const SB = {
  async req(path, { method = "GET", body, headers = {} } = {}) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        "Content-Type": "application/json",
        Prefer: method === "POST" ? "return=representation" : "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  },

  configurado() {
    return (
      typeof SUPABASE_URL === "string" &&
      typeof SUPABASE_ANON === "string" &&
      !SUPABASE_URL.includes("SEU-PROJETO") &&
      !SUPABASE_ANON.includes("SUA-ANON")
    );
  },
};