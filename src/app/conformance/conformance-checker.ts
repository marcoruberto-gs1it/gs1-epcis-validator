import {
  CBV_BIZSTEPS,
  CBV_BIZ_TRANSACTION_TYPES,
  CBV_DISPOSITIONS,
  CBV_ERROR_REASONS,
  CBV_SOURCE_DEST_TYPES,
  CbvEntry,
  EVENT_TYPES,
  normalizeCbvCode,
} from '../cbv/cbv-vocabulary';

/**
 * Controlli di conformità che vanno oltre lo schema JSON verificato da OpenEPCIS:
 * regole dello standard EPCIS 2.0, vocabolari CBV 2.0, struttura degli identificatori
 * GS1 e buone pratiche di implementazione.
 */

export type Severity = 'errore' | 'avviso' | 'info';

export type Category = 'Standard EPCIS' | 'CBV' | 'Identificatori GS1' | 'Buone pratiche';

export interface Finding {
  severity: Severity;
  category: Category;
  path: string;
  message: string;
  suggestion?: string;
}

type Json = Record<string, unknown>;

const EPCIS_CONTEXT_URL = 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld';
const EPCIS_CONTEXT_PREFIX = 'https://ref.gs1.org/standards/epcis/';

/** Prefissi già definiti dal contesto JSON-LD di EPCIS 2.0. */
const PREDEFINED_PREFIXES = new Set([
  'epcis',
  'cbv',
  'cbvmda',
  'gs1',
  'rdf',
  'rdfs',
  'owl',
  'xsd',
  'dcterms',
  'sosa',
  'ssn',
  'skos',
]);

const PLACEHOLDER_HOSTS = /(^|\.)example\.(org|com|net)$/i;

/** Abbinamenti bizStep → disposition raccomandati nelle linee guida CBV. */
const RECOMMENDED_DISPOSITIONS: Record<string, string[]> = {
  commissioning: ['active'],
  decommissioning: ['inactive'],
  destroying: ['destroyed'],
  shipping: ['in_transit'],
  retail_selling: ['retail_sold'],
  dispensing: ['dispensed', 'partially_dispensed'],
  receiving: ['in_progress', 'active', 'sellable_not_accessible', 'sellable_accessible'],
  inspecting: ['conformant', 'non_conformant', 'in_progress', 'active'],
};

/** Per questi bizStep la merce è in movimento: bizLocation di norma si omette. */
const IN_TRANSIT_BIZSTEPS = new Set(['shipping', 'departing', 'transporting']);

/** bizStep che descrivono un passaggio tra partner. */
const TRANSFER_BIZSTEPS = new Set(['shipping', 'receiving', 'accepting', 'arriving', 'void_shipping']);

const EPC_LIST_KEYS = ['epcList', 'childEPCs', 'inputEPCList', 'outputEPCList'];
const QUANTITY_LIST_KEYS = ['quantityList', 'childQuantityList', 'inputQuantityList', 'outputQuantityList'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function isUri(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:\S+$/.test(value);
}

/** Verifica la cifra di controllo GS1 (modulo 10) di una chiave numerica. */
export function hasValidCheckDigit(key: string): boolean {
  if (!/^\d{8,18}$/.test(key)) {
    return false;
  }
  const digits = key.split('').map(Number);
  const check = digits.pop()!;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    const d = digits[digits.length - 1 - i];
    sum += d * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10 === check;
}

/** Application Identifier con chiave numerica di lunghezza fissa e cifra di controllo. */
const CHECKED_KEYS: Record<string, { name: string; length: number }> = {
  '00': { name: 'SSCC', length: 18 },
  '01': { name: 'GTIN', length: 14 },
  '414': { name: 'GLN', length: 13 },
  '417': { name: 'GLN della parte (PGLN)', length: 13 },
};

interface DigitalLink {
  host: string;
  /** Coppie AI → valore, nell'ordine del percorso. */
  ais: Map<string, string>;
  primary: string;
}

function parseDigitalLink(value: string): DigitalLink | null {
  if (!/^https?:\/\//i.test(value)) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const segments = url.pathname.split('/').filter(Boolean);
  // Il percorso può avere un prefisso arbitrario: cerca la prima coppia AI/valore.
  const start = segments.findIndex((s) => /^\d{2,4}$/.test(s));
  if (start < 0 || (segments.length - start) % 2 !== 0) {
    return null;
  }
  const ais = new Map<string, string>();
  for (let i = start; i < segments.length; i += 2) {
    ais.set(segments[i], decodeURIComponent(segments[i + 1]));
  }
  return { host: url.host, ais, primary: segments[start] };
}

/** Controlla dominio canonico e cifre di controllo di un GS1 Digital Link. */
function checkDigitalLink(dl: DigitalLink, path: string, out: Finding[]): void {
  for (const [ai, val] of dl.ais) {
    const spec = CHECKED_KEYS[ai];
    if (!spec) {
      continue;
    }
    if (!/^\d+$/.test(val) || val.length !== spec.length) {
      out.push({
        severity: 'errore',
        category: 'Identificatori GS1',
        path,
        message: `Il ${spec.name} "${val}" (AI ${ai}) deve essere composto da ${spec.length} cifre.`,
        suggestion:
          ai === '01'
            ? 'Nel Digital Link il GTIN va sempre scritto su 14 cifre, completando con zeri a sinistra.'
            : undefined,
      });
    } else if (!hasValidCheckDigit(val)) {
      out.push({
        severity: 'errore',
        category: 'Identificatori GS1',
        path,
        message: `La cifra di controllo del ${spec.name} "${val}" non è corretta.`,
        suggestion: 'Ricalcola la cifra di controllo con il calcolatore GS1.',
      });
    }
  }
  if (dl.host.toLowerCase() !== 'id.gs1.org') {
    out.push({
      severity: 'info',
      category: 'Identificatori GS1',
      path,
      message: `Il Digital Link usa il dominio "${dl.host}".`,
      suggestion:
        "In EPCIS 2.0 è raccomandata la forma canonica con dominio https://id.gs1.org, che rende l'identificatore indipendente dal resolver dell'azienda.",
    });
  }
}

type IdKind = 'instance' | 'class' | 'location' | 'party' | 'transaction' | 'other-gs1' | 'non-gs1';

function classifyIdentifier(value: string): { kind: IdKind; dl: DigitalLink | null } {
  const dl = parseDigitalLink(value);
  if (dl) {
    const ais = dl.ais;
    if (ais.has('01')) {
      return { kind: ais.has('21') ? 'instance' : 'class', dl };
    }
    if (ais.has('414')) return { kind: 'location', dl };
    if (ais.has('417')) return { kind: 'party', dl };
    if (['00', '8003', '8004', '8006', '8010', '8017', '8018', '253', '255'].includes(dl.primary)) {
      return { kind: 'instance', dl };
    }
    if (['401', '402'].includes(dl.primary)) return { kind: 'transaction', dl };
    return { kind: 'other-gs1', dl };
  }
  if (/^urn:epc:id:(sgln):/i.test(value)) return { kind: 'location', dl: null };
  if (/^urn:epc:id:(pgln):/i.test(value)) return { kind: 'party', dl: null };
  if (/^urn:epc:id:/i.test(value)) return { kind: 'instance', dl: null };
  if (/^urn:epc:(class|idpat):/i.test(value)) return { kind: 'class', dl: null };
  if (/^urn:epcglobal:cbv:bt:/i.test(value)) return { kind: 'transaction', dl: null };
  return { kind: 'non-gs1', dl: null };
}

function cbvLookup(vocab: Record<string, CbvEntry>, value: string): string | null {
  const code = normalizeCbvCode(value);
  return vocab[code] ? code : null;
}

/** Valore CBV non riconosciuto: distingue tra errore (valore libero) e valore privato (URI). */
function checkCbvValue(
  vocab: Record<string, CbvEntry>,
  field: string,
  value: unknown,
  path: string,
  out: Finding[],
): string | null {
  const v = str(value);
  if (v === null) {
    return null;
  }
  const code = cbvLookup(vocab, v);
  if (code) {
    if (v.startsWith('urn:epcglobal:cbv:')) {
      out.push({
        severity: 'info',
        category: 'CBV',
        path,
        message: `Il valore ${field} "${v}" usa la forma URN di EPCIS 1.x.`,
        suggestion: `In EPCIS 2.0 JSON/JSON-LD si raccomanda la forma breve "${code}".`,
      });
    }
    return code;
  }
  if (isUri(v) && !/^https:\/\/ref\.gs1\.org\/cbv\//.test(v) && !v.startsWith('urn:epcglobal:cbv:')) {
    out.push({
      severity: 'avviso',
      category: 'CBV',
      path,
      message: `"${v}" non è un valore standard CBV per ${field}: è un valore privato.`,
      suggestion:
        'I valori privati sono ammessi ma riducono l’interoperabilità: usa un valore standard CBV quando ne esiste uno adatto.',
    });
  } else {
    out.push({
      severity: 'errore',
      category: 'CBV',
      path,
      message: `"${v}" non è un valore valido del vocabolario CBV per ${field}.`,
      suggestion: suggestSimilar(vocab, v),
    });
  }
  return null;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return prev[b.length];
}

function suggestSimilar(vocab: Record<string, CbvEntry>, value: string): string {
  const simplify = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const needle = simplify(normalizeCbvCode(value));
  let match: string | null = null;
  let best = Infinity;
  for (const k of Object.keys(vocab)) {
    const d = editDistance(needle, simplify(k));
    if (d < best) {
      best = d;
      match = k;
    }
  }
  if (best > Math.max(2, Math.floor(needle.length / 4))) {
    match = null;
  }
  return match
    ? `Forse intendevi "${match}"? Usa un valore del vocabolario CBV 2.0 oppure un URI privato con namespace proprio.`
    : 'Usa un valore del vocabolario CBV 2.0 oppure un URI privato con namespace proprio.';
}

function parseTime(value: unknown): Date | null {
  const v = str(value);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Controlli a livello di documento
// ---------------------------------------------------------------------------

interface ContextInfo {
  prefixes: Set<string>;
  hasEpcisContext: boolean;
}

function readContext(doc: Json, out: Finding[]): ContextInfo {
  const prefixes = new Set(PREDEFINED_PREFIXES);
  const ctx = doc['@context'];
  const entries = Array.isArray(ctx) ? ctx : ctx === undefined ? [] : [ctx];
  let hasEpcisContext = false;

  for (const entry of entries) {
    if (typeof entry === 'string') {
      if (entry === EPCIS_CONTEXT_URL) {
        hasEpcisContext = true;
      } else if (entry.startsWith(EPCIS_CONTEXT_PREFIX)) {
        hasEpcisContext = true;
        out.push({
          severity: 'avviso',
          category: 'Standard EPCIS',
          path: '@context',
          message: `Il contesto "${entry}" non corrisponde a quello di EPCIS 2.0.`,
          suggestion: `Usa "${EPCIS_CONTEXT_URL}".`,
        });
      }
    } else if (isObject(entry)) {
      for (const [key, val] of Object.entries(entry)) {
        if (typeof val === 'string' && !key.includes(':')) {
          prefixes.add(key);
          checkNamespace(key, val, out);
        }
      }
    }
  }

  if (!hasEpcisContext) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: '@context',
      message: 'Il documento non fa riferimento al contesto JSON-LD di EPCIS 2.0.',
      suggestion: `Aggiungi "${EPCIS_CONTEXT_URL}" come primo elemento di @context.`,
    });
  }
  return { prefixes, hasEpcisContext };
}

function checkNamespace(prefix: string, uri: string, out: Finding[]): void {
  let host = '';
  try {
    host = new URL(uri).host;
  } catch {
    if (!/^urn:/i.test(uri)) {
      out.push({
        severity: 'errore',
        category: 'Standard EPCIS',
        path: `@context.${prefix}`,
        message: `Il namespace "${uri}" del prefisso "${prefix}" non è un URI valido.`,
      });
    }
    return;
  }
  if (PLACEHOLDER_HOSTS.test(host)) {
    out.push({
      severity: 'avviso',
      category: 'Buone pratiche',
      path: `@context.${prefix}`,
      message: `Il prefisso "${prefix}" usa un namespace segnaposto (${host}).`,
      suggestion:
        'Le estensioni devono usare un namespace su un dominio controllato dalla tua organizzazione, così da evitare collisioni con quelle di altri.',
    });
  }
  if (!/[/#]$/.test(uri)) {
    out.push({
      severity: 'info',
      category: 'Buone pratiche',
      path: `@context.${prefix}`,
      message: `Il namespace del prefisso "${prefix}" non termina con "/" o "#".`,
      suggestion: 'Senza separatore finale gli URI espansi delle estensioni risultano poco leggibili.',
    });
  }
}

/** Segnala chiavi con prefisso non dichiarato in @context, ovunque nel documento. */
function checkUndeclaredPrefixes(value: unknown, path: string, ctx: ContextInfo, out: Finding[], seen: Set<string>): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => checkUndeclaredPrefixes(v, `${path}[${i}]`, ctx, out, seen));
    return;
  }
  if (!isObject(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === '@context') continue;
    const childPath = path ? `${path}.${key}` : key;
    const m = /^([A-Za-z][\w.-]*):/.exec(key);
    if (m && !key.startsWith('http') && !ctx.prefixes.has(m[1]) && !seen.has(m[1])) {
      seen.add(m[1]);
      out.push({
        severity: 'errore',
        category: 'Standard EPCIS',
        path: childPath,
        message: `Il prefisso "${m[1]}" usato nell'estensione "${key}" non è dichiarato in @context.`,
        suggestion: `Aggiungi a @context un oggetto con { "${m[1]}": "https://<tuo-dominio>/..." }.`,
      });
    }
    checkUndeclaredPrefixes(child, childPath, ctx, out, seen);
  }
}

// ---------------------------------------------------------------------------
// Controlli a livello di evento
// ---------------------------------------------------------------------------

function checkEvent(event: Json, path: string, docCreation: Date | null, out: Finding[]): void {
  const type = str(event['type']) ?? '';
  if (!EVENT_TYPES[type]) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.type`,
      message: `"${type || '(assente)'}" non è un tipo di evento EPCIS 2.0.`,
      suggestion: `Tipi ammessi: ${Object.keys(EVENT_TYPES).join(', ')}.`,
    });
    return;
  }

  const action = str(event['action']);
  checkTimes(event, path, docCreation, out);
  checkEventId(event, path, out);

  // --- bizStep / disposition -------------------------------------------------
  let bizStep: string | null = null;
  if (event['bizStep'] === undefined) {
    out.push({
      severity: 'avviso',
      category: 'CBV',
      path: `${path}.bizStep`,
      message: 'bizStep non è valorizzato.',
      suggestion: 'Indica sempre il passo di business con un valore CBV: senza bizStep l’evento è difficile da interpretare per i partner.',
    });
  } else {
    bizStep = checkCbvValue(CBV_BIZSTEPS, 'bizStep', event['bizStep'], `${path}.bizStep`, out);
  }

  let disposition: string | null = null;
  if (event['disposition'] !== undefined) {
    disposition = checkCbvValue(CBV_DISPOSITIONS, 'disposition', event['disposition'], `${path}.disposition`, out);
  }

  if (bizStep && RECOMMENDED_DISPOSITIONS[bizStep]) {
    const expected = RECOMMENDED_DISPOSITIONS[bizStep];
    if (event['disposition'] === undefined) {
      out.push({
        severity: 'info',
        category: 'CBV',
        path: `${path}.disposition`,
        message: `Per il bizStep "${bizStep}" manca la disposition.`,
        suggestion: `Valori tipici: ${expected.map((d) => `"${d}"`).join(', ')}.`,
      });
    } else if (disposition && !expected.includes(disposition)) {
      out.push({
        severity: 'info',
        category: 'CBV',
        path: `${path}.disposition`,
        message: `La disposition "${disposition}" è insolita per il bizStep "${bizStep}".`,
        suggestion: `Le linee guida CBV indicano tipicamente ${expected.map((d) => `"${d}"`).join(', ')}.`,
      });
    }
  }

  // --- regole sull'azione ---------------------------------------------------
  if (type === 'ObjectEvent') {
    if (bizStep === 'commissioning' && action && action !== 'ADD') {
      out.push({
        severity: 'avviso',
        category: 'CBV',
        path: `${path}.action`,
        message: `Il bizStep "commissioning" richiede action "ADD" (trovato "${action}").`,
      });
    }
    if (bizStep === 'decommissioning' && action && action !== 'DELETE') {
      out.push({
        severity: 'avviso',
        category: 'CBV',
        path: `${path}.action`,
        message: `Il bizStep "decommissioning" richiede action "DELETE" (trovato "${action}").`,
      });
    }
    if (event['ilmd'] !== undefined && action !== 'ADD') {
      out.push({
        severity: 'errore',
        category: 'Standard EPCIS',
        path: `${path}.ilmd`,
        message: 'In un ObjectEvent l’ILMD è ammesso solo con action "ADD".',
        suggestion: 'L’ILMD descrive il lotto o l’istanza al momento della sua creazione (commissioning).',
      });
    }
    const hasEpcs = asArray(event['epcList']).length > 0;
    const hasQty = asArray(event['quantityList']).length > 0;
    if (!hasEpcs && !hasQty) {
      out.push({
        severity: 'errore',
        category: 'Standard EPCIS',
        path,
        message: 'L’ObjectEvent non contiene né epcList né quantityList.',
        suggestion: 'Un ObjectEvent deve riferirsi ad almeno un oggetto o una classe di oggetti.',
      });
    }
  }

  if (type === 'AggregationEvent' && (action === 'ADD' || action === 'DELETE') && !event['parentID']) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.parentID`,
      message: `Un AggregationEvent con action "${action}" deve indicare parentID.`,
    });
  }
  if (type === 'AggregationEvent' && event['parentID']) {
    const parent = str(event['parentID']);
    if (parent && classifyIdentifier(parent).dl?.primary !== '00' && !/^urn:epc:id:(sscc|grai|giai):/i.test(parent)) {
      out.push({
        severity: 'info',
        category: 'Identificatori GS1',
        path: `${path}.parentID`,
        message: 'Il parentID non è un SSCC.',
        suggestion: 'Per pallet e colli il contenitore si identifica di norma con un SSCC (AI 00).',
      });
    }
  }

  if (type === 'TransformationEvent') {
    const hasInput = asArray(event['inputEPCList']).length > 0 || asArray(event['inputQuantityList']).length > 0;
    const hasOutput = asArray(event['outputEPCList']).length > 0 || asArray(event['outputQuantityList']).length > 0;
    if (!event['transformationID'] && (!hasInput || !hasOutput)) {
      out.push({
        severity: 'errore',
        category: 'Standard EPCIS',
        path,
        message: 'Un TransformationEvent senza transformationID deve avere almeno un input e almeno un output.',
      });
    }
  }

  if (type === 'TransactionEvent' && asArray(event['bizTransactionList']).length === 0) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.bizTransactionList`,
      message: 'Un TransactionEvent deve contenere almeno una business transaction.',
    });
  }

  // --- luoghi ---------------------------------------------------------------
  checkLocation(event, 'readPoint', path, out);
  checkLocation(event, 'bizLocation', path, out);

  if (bizStep && IN_TRANSIT_BIZSTEPS.has(bizStep) && event['bizLocation'] !== undefined) {
    out.push({
      severity: 'info',
      category: 'CBV',
      path: `${path}.bizLocation`,
      message: `Con il bizStep "${bizStep}" gli oggetti sono in transito.`,
      suggestion: 'Di norma bizLocation si omette: il luogo di partenza va nel readPoint e in sourceList.',
    });
  }
  if (event['bizLocation'] === undefined && !(bizStep && IN_TRANSIT_BIZSTEPS.has(bizStep)) && action !== 'DELETE') {
    out.push({
      severity: 'info',
      category: 'Buone pratiche',
      path: `${path}.bizLocation`,
      message: 'bizLocation non è valorizzato.',
      suggestion: 'Indica dove si trovano gli oggetti dopo l’evento (GLN), per rispondere alla domanda “dove?”.',
    });
  }
  if (event['readPoint'] === undefined) {
    out.push({
      severity: 'info',
      category: 'Buone pratiche',
      path: `${path}.readPoint`,
      message: 'readPoint non è valorizzato.',
      suggestion: 'Il readPoint indica il punto preciso (es. baia, varco, postazione) in cui l’evento è stato rilevato.',
    });
  }

  // --- identificatori -------------------------------------------------------
  for (const key of EPC_LIST_KEYS) {
    asArray(event[key]).forEach((epc, i) => checkInstanceId(epc, `${path}.${key}[${i}]`, out));
  }
  if (event['parentID'] !== undefined) {
    checkInstanceId(event['parentID'], `${path}.parentID`, out);
  }
  for (const key of QUANTITY_LIST_KEYS) {
    asArray(event[key]).forEach((q, i) => checkQuantity(q, `${path}.${key}[${i}]`, out));
  }

  // --- transazioni, source/destination, errori -------------------------------
  asArray(event['bizTransactionList']).forEach((bt, i) => checkBizTransaction(bt, `${path}.bizTransactionList[${i}]`, out));
  for (const listKey of ['sourceList', 'destinationList'] as const) {
    asArray(event[listKey]).forEach((sd, i) => checkSourceDest(sd, listKey, `${path}.${listKey}[${i}]`, out));
  }
  if (bizStep && TRANSFER_BIZSTEPS.has(bizStep)) {
    if (event['sourceList'] === undefined && event['destinationList'] === undefined) {
      out.push({
        severity: 'info',
        category: 'Buone pratiche',
        path,
        message: `L’evento "${bizStep}" descrive un passaggio tra partner ma non ha sourceList/destinationList.`,
        suggestion: 'Indica mittente e destinatario (owning_party / possessing_party / location) per completare la tracciabilità.',
      });
    }
    if (event['bizTransactionList'] === undefined) {
      out.push({
        severity: 'info',
        category: 'Buone pratiche',
        path,
        message: `L’evento "${bizStep}" non è collegato a documenti commerciali.`,
        suggestion: 'Aggiungi in bizTransactionList i riferimenti a ordine (po) o avviso di spedizione (desadv).',
      });
    }
  }

  const persistent = event['persistentDisposition'];
  if (isObject(persistent)) {
    for (const k of ['set', 'unset']) {
      asArray(persistent[k]).forEach((d, i) =>
        checkCbvValue(CBV_DISPOSITIONS, 'disposition', d, `${path}.persistentDisposition.${k}[${i}]`, out),
      );
    }
  }

  const errDecl = event['errorDeclaration'];
  if (isObject(errDecl) && errDecl['reason'] !== undefined) {
    checkCbvValue(CBV_ERROR_REASONS, 'reason', errDecl['reason'], `${path}.errorDeclaration.reason`, out);
  }
}

function checkTimes(event: Json, path: string, docCreation: Date | null, out: Finding[]): void {
  const rawTime = str(event['eventTime']);
  const eventTime = parseTime(rawTime);
  if (rawTime && !/(Z|[+-]\d{2}:\d{2})$/.test(rawTime)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.eventTime`,
      message: 'eventTime non indica il fuso orario.',
      suggestion: 'Usa il formato ISO 8601 con "Z" (UTC) o con l’offset, ad esempio 2026-09-25T07:42:00.000Z.',
    });
  }
  if (eventTime && eventTime.getTime() > Date.now() + 5 * 60_000) {
    out.push({
      severity: 'avviso',
      category: 'Buone pratiche',
      path: `${path}.eventTime`,
      message: 'eventTime è nel futuro.',
      suggestion: 'Un evento EPCIS registra qualcosa che è già avvenuto: verifica data e fuso orario.',
    });
  }
  if (eventTime && docCreation && eventTime.getTime() > docCreation.getTime()) {
    out.push({
      severity: 'avviso',
      category: 'Buone pratiche',
      path: `${path}.eventTime`,
      message: 'eventTime è successivo alla creationDate del documento.',
      suggestion: 'Il documento non può essere stato creato prima degli eventi che contiene: controlla i fusi orari.',
    });
  }
  const offset = str(event['eventTimeZoneOffset']);
  if (offset && !/^[+-]\d{2}:\d{2}$/.test(offset)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.eventTimeZoneOffset`,
      message: `eventTimeZoneOffset "${offset}" non è nel formato ±hh:mm.`,
    });
  }
  if (event['recordTime'] !== undefined) {
    out.push({
      severity: 'info',
      category: 'Standard EPCIS',
      path: `${path}.recordTime`,
      message: 'recordTime è valorizzato.',
      suggestion: 'recordTime viene assegnato dal repository EPCIS al momento della cattura: in capture può essere omesso.',
    });
  }
}

function checkEventId(event: Json, path: string, out: Finding[]): void {
  const id = event['eventID'];
  if (id === undefined) {
    out.push({
      severity: 'avviso',
      category: 'Buone pratiche',
      path: `${path}.eventID`,
      message: 'eventID non è valorizzato.',
      suggestion:
        'Assegna un identificatore univoco (es. urn:uuid:… oppure l’hash CBV ni:///sha-256;…): serve per evitare duplicati e per correggere l’evento con errorDeclaration.',
    });
    return;
  }
  const v = str(id);
  if (!v || !isUri(v)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.eventID`,
      message: 'eventID deve essere un URI.',
      suggestion: 'Usa ad esempio urn:uuid:<UUID> oppure l’event hash ID ni:///sha-256;…',
    });
  } else if (/^urn:uuid:/i.test(v) && !/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.eventID`,
      message: `"${v}" non è un UUID valido.`,
    });
  }
}

function checkLocation(event: Json, key: 'readPoint' | 'bizLocation', path: string, out: Finding[]): void {
  const loc = event[key];
  if (!isObject(loc)) return;
  const id = str(loc['id']);
  if (!id) return;
  const fieldPath = `${path}.${key}.id`;
  const { kind, dl } = classifyIdentifier(id);
  if (dl) checkDigitalLink(dl, fieldPath, out);
  if (kind !== 'location') {
    out.push({
      severity: 'avviso',
      category: 'Identificatori GS1',
      path: fieldPath,
      message: `${key} usa un identificatore non GS1 ("${id}").`,
      suggestion:
        'CBV raccomanda un GLN: Digital Link https://id.gs1.org/414/<GLN> (con /254/<estensione> per una sotto-area) oppure urn:epc:id:sgln:…',
    });
  }
}

function checkInstanceId(value: unknown, path: string, out: Finding[]): void {
  const id = str(value);
  if (!id) return;
  const { kind, dl } = classifyIdentifier(id);
  if (dl) checkDigitalLink(dl, path, out);
  if (kind === 'class') {
    out.push({
      severity: 'avviso',
      category: 'Identificatori GS1',
      path,
      message: `"${id}" identifica una classe di prodotto, non un singolo oggetto.`,
      suggestion: 'Per GTIN senza seriale (o con solo lotto) usa quantityList con epcClass e quantity.',
    });
  } else if (kind === 'non-gs1') {
    out.push({
      severity: 'avviso',
      category: 'Identificatori GS1',
      path,
      message: `"${id}" non è un identificatore GS1.`,
      suggestion: 'Usa un GS1 Digital Link (es. https://id.gs1.org/01/<GTIN>/21/<seriale>) o un EPC URI.',
    });
  }
}

function checkQuantity(value: unknown, path: string, out: Finding[]): void {
  if (!isObject(value)) return;
  const epcClass = str(value['epcClass']);
  if (epcClass) {
    const { kind, dl } = classifyIdentifier(epcClass);
    if (dl) checkDigitalLink(dl, `${path}.epcClass`, out);
    if (kind === 'instance') {
      out.push({
        severity: 'avviso',
        category: 'Identificatori GS1',
        path: `${path}.epcClass`,
        message: `"${epcClass}" identifica un singolo oggetto, non una classe.`,
        suggestion: 'Per oggetti serializzati usa epcList; in quantityList va il GTIN, eventualmente con lotto (AI 10).',
      });
    } else if (kind === 'non-gs1') {
      out.push({
        severity: 'avviso',
        category: 'Identificatori GS1',
        path: `${path}.epcClass`,
        message: `"${epcClass}" non è un identificatore di classe GS1.`,
        suggestion: 'Usa https://id.gs1.org/01/<GTIN> oppure https://id.gs1.org/01/<GTIN>/10/<lotto>.',
      });
    }
  }
  const quantity = value['quantity'];
  const uom = str(value['uom']);
  if (uom !== null && !/^[A-Z0-9]{2,3}$/.test(uom)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.uom`,
      message: `"${uom}" non è un codice UN/ECE Recommendation 20.`,
      suggestion: 'Usa codici di 2-3 caratteri maiuscoli, ad esempio KGM (chilogrammi), GRM (grammi), LTR (litri), MTR (metri).',
    });
  }
  if (typeof quantity === 'number' && uom === null && !Number.isInteger(quantity)) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: `${path}.quantity`,
      message: 'Una quantità decimale richiede l’unità di misura (uom).',
      suggestion: 'Senza uom la quantità indica un numero di pezzi e deve essere intera.',
    });
  }
}

function checkBizTransaction(value: unknown, path: string, out: Finding[]): void {
  if (!isObject(value)) return;
  if (value['type'] !== undefined) {
    checkCbvValue(CBV_BIZ_TRANSACTION_TYPES, 'business transaction type', value['type'], `${path}.type`, out);
  } else {
    out.push({
      severity: 'info',
      category: 'CBV',
      path: `${path}.type`,
      message: 'La business transaction non indica il tipo.',
      suggestion: 'Specifica il tipo di documento con un valore CBV (po, desadv, inv, …).',
    });
  }
  const id = str(value['bizTransaction']);
  if (id) {
    const { kind, dl } = classifyIdentifier(id);
    if (dl) checkDigitalLink(dl, `${path}.bizTransaction`, out);
    if (kind === 'non-gs1') {
      out.push({
        severity: 'info',
        category: 'Identificatori GS1',
        path: `${path}.bizTransaction`,
        message: 'La business transaction usa un identificatore non GS1.',
        suggestion:
          'CBV raccomanda urn:epcglobal:cbv:bt:<GLN>:<numero documento> o un GDTI, così il riferimento è univoco tra i partner.',
      });
    }
  }
}

function checkSourceDest(value: unknown, listKey: 'sourceList' | 'destinationList', path: string, out: Finding[]): void {
  if (!isObject(value)) return;
  const typeCode = checkCbvValue(CBV_SOURCE_DEST_TYPES, 'source/destination type', value['type'], `${path}.type`, out);
  const idKey = listKey === 'sourceList' ? 'source' : 'destination';
  const id = str(value[idKey]);
  if (!id) return;
  const { kind, dl } = classifyIdentifier(id);
  if (dl) checkDigitalLink(dl, `${path}.${idKey}`, out);
  const expected = typeCode === 'location' ? ['location'] : ['party', 'location'];
  if (!expected.includes(kind)) {
    out.push({
      severity: 'avviso',
      category: 'Identificatori GS1',
      path: `${path}.${idKey}`,
      message: `"${id}" non è un GLN.`,
      suggestion:
        typeCode === 'location'
          ? 'Per il tipo "location" usa https://id.gs1.org/414/<GLN> o urn:epc:id:sgln:…'
          : 'Per owning_party/possessing_party usa https://id.gs1.org/417/<GLN> o urn:epc:id:pgln:…',
    });
  }
}

// ---------------------------------------------------------------------------
// Punto di ingresso
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Record<Severity, number> = { errore: 0, avviso: 1, info: 2 };

function extractEvents(doc: Json): { events: unknown[]; basePath: string } | null {
  if (EVENT_TYPES[str(doc['type']) ?? '']) {
    return { events: [doc], basePath: '' };
  }
  const body = doc['epcisBody'];
  if (!isObject(body)) return null;
  if (Array.isArray(body['eventList'])) {
    return { events: body['eventList'], basePath: 'epcisBody.eventList' };
  }
  const results = body['queryResults'];
  if (isObject(results) && isObject(results['resultsBody']) && Array.isArray(results['resultsBody']['eventList'])) {
    return { events: results['resultsBody']['eventList'], basePath: 'epcisBody.queryResults.resultsBody.eventList' };
  }
  return null;
}

export function checkConformance(data: unknown): Finding[] {
  const out: Finding[] = [];
  if (!isObject(data)) {
    return [
      {
        severity: 'errore',
        category: 'Standard EPCIS',
        path: '(radice)',
        message: 'Il documento deve essere un oggetto JSON.',
      },
    ];
  }

  const ctx = readContext(data, out);
  checkUndeclaredPrefixes(data, '', ctx, out, new Set());

  const docType = str(data['type']);
  if (docType === 'EPCISDocument' || docType === 'EPCISQueryDocument') {
    const sv = data['schemaVersion'];
    if (sv !== '2.0') {
      out.push({
        severity: 'avviso',
        category: 'Standard EPCIS',
        path: 'schemaVersion',
        message: `schemaVersion vale ${JSON.stringify(sv ?? null)}.`,
        suggestion: 'Per documenti EPCIS 2.0 usa "2.0" (stringa).',
      });
    }
  }

  const docCreation = parseTime(data['creationDate']);
  const extracted = extractEvents(data);
  if (!extracted) {
    out.push({
      severity: 'errore',
      category: 'Standard EPCIS',
      path: 'epcisBody',
      message: 'Impossibile trovare l’elenco degli eventi.',
      suggestion: 'Gli eventi vanno in epcisBody.eventList.',
    });
  } else if (extracted.events.length === 0) {
    out.push({
      severity: 'avviso',
      category: 'Standard EPCIS',
      path: extracted.basePath,
      message: 'Il documento non contiene eventi.',
    });
  } else {
    const ids = new Map<string, number>();
    extracted.events.forEach((event, i) => {
      const path = extracted.basePath ? `${extracted.basePath}[${i}]` : `(evento)`;
      if (!isObject(event)) return;
      checkEvent(event, path, docCreation, out);
      const id = str(event['eventID']);
      if (id) {
        if (ids.has(id)) {
          out.push({
            severity: 'errore',
            category: 'Standard EPCIS',
            path: `${path}.eventID`,
            message: `eventID duplicato: è già usato dall’evento ${ids.get(id)}.`,
          });
        } else {
          ids.set(id, i);
        }
      }
    });
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
