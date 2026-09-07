// CORS proxy verso l'API pubblica di OpenEPCIS (tools.openepcis.io), che dal
// browser risulta bloccata perché il server non invia più header CORS.
//
// Come usarlo (gratis, senza CLI):
// 1. Vai su https://dash.cloudflare.com/sign-up e crea un account gratuito.
// 2. Nel menu a sinistra: Workers & Pages -> Create -> Create Worker.
// 3. Dai un nome (es. "epcis-cors-proxy") e clicca Deploy.
// 4. Clicca "Edit code", cancella tutto e incolla il contenuto di questo file.
// 5. Clicca Deploy.
// 6. Copia l'URL mostrato in alto (es. https://epcis-cors-proxy.<tuo-nome>.workers.dev).
// 7. Passa quell'URL a Claude per aggiornare l'app.

const TARGET = 'https://tools.openepcis.io/api/events/validate';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, GS1-EPCIS-Version',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const upstream = await fetch(TARGET + url.search, {
      method: request.method,
      headers: {
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'GS1-EPCIS-Version': request.headers.get('GS1-EPCIS-Version') || '2.0.0',
      },
      body: request.method === 'POST' ? await request.text() : undefined,
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': upstream.headers.get('Content-Type') || 'text/plain',
      },
    });
  },
};
