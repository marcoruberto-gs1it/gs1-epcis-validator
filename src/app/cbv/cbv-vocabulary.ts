export interface CbvEntry {
  label: string;
  description: string;
}

export interface FieldInfo extends CbvEntry {
  cbv: boolean;
}

const CBV_PREFIXES = [
  'urn:epcglobal:cbv:bizstep:',
  'urn:epcglobal:cbv:disp:',
  'urn:epcglobal:cbv:btt:',
  'urn:epcglobal:cbv:sdt:',
  'urn:epcglobal:cbv:er:',
];

function normalizeCbvCode(value: string): string {
  for (const prefix of CBV_PREFIXES) {
    if (value.startsWith(prefix)) {
      return value.slice(prefix.length);
    }
  }
  return value;
}

function entry(label: string, description: string): CbvEntry {
  return { label, description };
}

export const CBV_BIZSTEPS: Record<string, CbvEntry> = {
  accepting: entry('Accepting', 'Accettazione formale degli oggetti da parte del destinatario.'),
  arriving: entry('Arriving', "Gli oggetti sono arrivati presso una sede."),
  assembling: entry('Assembling', "Gli oggetti vengono assemblati in un'unità superiore."),
  collecting: entry('Collecting', 'Raccolta di oggetti, ad esempio rifiuti o campioni.'),
  commissioning: entry('Commissioning', "Prima associazione di un identificatore EPC a un oggetto fisico."),
  consolidating: entry('Consolidating', 'Oggetti provenienti da fonti diverse vengono raggruppati insieme.'),
  creating_class_instance: entry(
    'Creating Class Instance',
    "Viene creata una nuova istanza o un nuovo lotto di una classe di prodotto.",
  ),
  cycle_counting: entry('Cycle Counting', "Conteggio periodico dell'inventario."),
  decommissioning: entry('Decommissioning', "L'identificatore EPC cessa di essere associato all'oggetto fisico."),
  departing: entry('Departing', 'Gli oggetti stanno lasciando una sede.'),
  destroying: entry('Destroying', 'Gli oggetti vengono distrutti.'),
  disassembling: entry('Disassembling', 'Un’unità viene scomposta nei suoi componenti.'),
  dispensing: entry('Dispensing', "Gli oggetti vengono erogati al consumatore finale, ad esempio in farmacia."),
  encoding: entry('Encoding', 'Un identificatore viene codificato su un tag o un’etichetta.'),
  entering_exiting: entry('Entering/Exiting', "Gli oggetti entrano o escono da un'area o un veicolo."),
  holding: entry('Holding', 'Gli oggetti vengono trattenuti temporaneamente, in attesa di ulteriori azioni.'),
  inspecting: entry('Inspecting', 'Gli oggetti vengono ispezionati o controllati.'),
  installing: entry('Installing', "Gli oggetti vengono installati in un impianto o una struttura."),
  killing: entry('Killing', 'Un tag viene disattivato permanentemente.'),
  loading: entry('Loading', 'Gli oggetti vengono caricati su un mezzo di trasporto.'),
  other: entry('Other', 'Passo di business non altrimenti classificato.'),
  packing: entry('Packing', "Gli oggetti vengono imballati in un contenitore o un'unità logistica."),
  picking: entry('Picking', "Gli oggetti vengono prelevati per l'evasione di un ordine."),
  receiving: entry('Receiving', 'Gli oggetti vengono ricevuti dal destinatario.'),
  removing: entry('Removing', "Gli oggetti vengono rimossi da un contenitore o un'unità logistica."),
  repackaging: entry('Repackaging', 'Gli oggetti vengono reimballati, ad esempio in un nuovo contenitore.'),
  repairing: entry('Repairing', 'Gli oggetti vengono riparati.'),
  replacing: entry('Replacing', 'Un oggetto viene sostituito con un altro.'),
  reserving: entry('Reserving', 'Gli oggetti vengono riservati, ad esempio per un ordine.'),
  retail_selling: entry('Retail Selling', 'Gli oggetti vengono venduti al consumatore finale.'),
  shipping: entry('Shipping', 'Gli oggetti lasciano la sede del mittente per essere spediti al destinatario.'),
  staging_outbound: entry(
    'Staging Outbound',
    "Gli oggetti vengono radunati in un'area di partenza in attesa di spedizione.",
  ),
  stock_taking: entry('Stock Taking', "Verifica dell'inventario fisico rispetto ai record."),
  stocking: entry('Stocking', 'Gli oggetti vengono collocati sugli scaffali o a scorta.'),
  storing: entry('Storing', 'Gli oggetti vengono immagazzinati.'),
  transporting: entry('Transporting', 'Gli oggetti sono in fase di trasporto.'),
  unloading: entry('Unloading', 'Gli oggetti vengono scaricati da un mezzo di trasporto.'),
  unpacking: entry('Unpacking', "Gli oggetti vengono estratti da un contenitore o un'unità logistica."),
  void_shipping: entry('Void Shipping', 'Annullamento di una spedizione precedentemente dichiarata.'),
  sampling: entry('Sampling', 'Viene prelevato un campione dagli oggetti.'),
};

export const CBV_DISPOSITIONS: Record<string, CbvEntry> = {
  active: entry('Active', "L'oggetto è attivo e operativo."),
  container_closed: entry('Container Closed', "Il contenitore o l'unità logistica è chiuso."),
  container_open: entry('Container Open', "Il contenitore o l'unità logistica è aperto."),
  damaged: entry('Damaged', 'Gli oggetti sono danneggiati.'),
  destroyed: entry('Destroyed', 'Gli oggetti sono stati distrutti.'),
  dispensed: entry('Dispensed', 'Gli oggetti sono stati erogati al consumatore finale.'),
  disposed: entry('Disposed', 'Gli oggetti sono stati smaltiti.'),
  encoded: entry('Encoded', 'L’identificatore è stato codificato sul tag.'),
  expired: entry('Expired', 'Gli oggetti sono scaduti.'),
  in_progress: entry('In Progress', "Il processo di business è in corso, non ancora concluso."),
  in_transit: entry('In Transit', 'Gli oggetti sono in transito tra due sedi.'),
  inactive: entry('Inactive', "L'oggetto non è attivo o operativo."),
  no_pedigree_match: entry('No Pedigree Match', 'Non è stata trovata corrispondenza con il pedigree atteso.'),
  non_sellable_other: entry(
    'Non Sellable (Other)',
    'Gli oggetti non sono vendibili per un motivo non altrimenti specificato.',
  ),
  partially_dispensed: entry('Partially Dispensed', "Solo una parte della quantità è stata erogata."),
  recalled: entry('Recalled', 'Gli oggetti sono stati richiamati dal mercato.'),
  reserved: entry('Reserved', 'Gli oggetti sono riservati e non disponibili per altri usi.'),
  retail_sold: entry('Retail Sold', 'Gli oggetti sono stati venduti al dettaglio.'),
  returned: entry('Returned', 'Gli oggetti sono stati restituiti.'),
  sellable_accessible: entry('Sellable Accessible', 'Gli oggetti sono vendibili e fisicamente accessibili.'),
  sellable_not_accessible: entry(
    'Sellable Not Accessible',
    'Gli oggetti sono vendibili ma non fisicamente accessibili, ad esempio in un container chiuso.',
  ),
  stolen: entry('Stolen', 'Gli oggetti risultano rubati.'),
  unknown: entry('Unknown', 'Lo stato di disposition non è noto.'),
};

export const CBV_BIZ_TRANSACTION_TYPES: Record<string, CbvEntry> = {
  bol: entry('Bill of Lading', 'Documento di trasporto / polizza di carico.'),
  desadv: entry('Despatch Advice', 'Avviso di spedizione.'),
  inv: entry('Invoice', 'Fattura.'),
  pedigree: entry('Pedigree', 'Documento di tracciabilità della catena di custodia.'),
  po: entry('Purchase Order', "Ordine di acquisto."),
  poc: entry('Purchase Order Confirmation', "Conferma d'ordine."),
  prodorder: entry('Production Order', 'Ordine di produzione.'),
  recadv: entry('Receiving Advice', 'Avviso di ricezione.'),
  rma: entry('Return Merchandise Authorisation', 'Autorizzazione al reso.'),
  upstreamARN: entry('Upstream Advance Receipt Notice', 'Avviso di ricezione anticipata a monte della filiera.'),
};

export const CBV_SOURCE_DEST_TYPES: Record<string, CbvEntry> = {
  owning_party: entry('Owning Party', 'Il partner commerciale proprietario degli oggetti.'),
  possessing_party: entry('Possessing Party', 'Il partner commerciale in possesso fisico degli oggetti.'),
  location: entry('Location', 'La sede fisica di origine o destinazione.'),
};

export const CBV_ERROR_REASONS: Record<string, CbvEntry> = {
  did_not_occur: entry('Did Not Occur', "L'evento originale dichiarato non si è mai verificato."),
  incorrect_data: entry('Incorrect Data', "L'evento originale conteneva dati errati, ora corretti."),
};

const EVENT_TYPES: Record<string, CbvEntry> = {
  ObjectEvent: entry('Object Event', "Descrive un'attività relativa a uno o più oggetti fisici (EPC)."),
  AggregationEvent: entry(
    'Aggregation Event',
    "Descrive l'associazione o la dissociazione di oggetti figli a un oggetto padre, ad esempio un pallet.",
  ),
  TransactionEvent: entry(
    'Transaction Event',
    'Descrive l’associazione di oggetti a una o più transazioni di business.',
  ),
  TransformationEvent: entry(
    'Transformation Event',
    'Descrive la trasformazione di oggetti di input in oggetti di output.',
  ),
  AssociationEvent: entry(
    'Association Event',
    "Descrive l'associazione tra un oggetto e un asset, un sensore o un altro EPC.",
  ),
};

const ACTION_MEANINGS: Record<string, CbvEntry> = {
  ADD: entry('Add', 'Gli EPC vengono associati per la prima volta al contesto descritto (bizStep/disposition/location).'),
  OBSERVE: entry('Observe', "Gli EPC vengono osservati nel contesto attuale, senza modificarne l'associazione."),
  DELETE: entry(
    'Delete',
    'Gli EPC vengono rimossi dal contesto, ad esempio in caso di disaggregazione o decommissioning.',
  ),
};

export const FIELD_INFO: Record<string, FieldInfo> = {
  eventTime: { label: 'Event Time', description: "Data e ora in cui l'evento si è verificato, in formato ISO 8601.", cbv: false },
  eventTimeZoneOffset: { label: 'Event Time Zone Offset', description: "Offset del fuso orario rispetto a UTC nel momento dell'evento.", cbv: false },
  recordTime: { label: 'Record Time', description: "Data e ora in cui l'evento è stato registrato dal repository.", cbv: false },
  eventID: { label: 'Event ID', description: "Identificatore univoco dell'evento.", cbv: false },
  type: { label: 'Type', description: 'Il tipo dell’elemento: dipende dal contesto (tipo di evento, di transazione, di source/destination, ecc.).', cbv: false },
  action: { label: 'Action', description: 'Indica se gli EPC vengono aggiunti, osservati o rimossi dal contesto descritto dall’evento.', cbv: false },
  bizStep: { label: 'Business Step', description: "Il passo del processo di business a cui si riferisce l'evento.", cbv: true },
  disposition: { label: 'Disposition', description: "Lo stato o la disposizione degli oggetti coinvolti dopo l'evento.", cbv: true },
  readPoint: { label: 'Read Point', description: "Il punto di lettura fisico specifico in cui è avvenuto l'evento.", cbv: false },
  bizLocation: { label: 'Business Location', description: 'Il luogo di business dove si trovano gli oggetti dopo l’evento.', cbv: false },
  bizTransactionList: { label: 'Business Transaction List', description: "Elenco delle transazioni di business associate all'evento, ad esempio ordine o fattura.", cbv: true },
  sourceList: { label: 'Source List', description: "Identifica l'origine (proprietario, possessore o luogo) coinvolta nell'evento, tipicamente per eventi di trasferimento.", cbv: true },
  destinationList: { label: 'Destination List', description: "Identifica la destinazione (proprietario, possessore o luogo) coinvolta nell'evento, tipicamente per eventi di trasferimento.", cbv: true },
  persistentDisposition: { label: 'Persistent Disposition', description: 'Elenco cumulativo delle disposition impostate (set) o rimosse (unset) nel tempo per gli EPC coinvolti.', cbv: true },
  errorDeclaration: { label: 'Error Declaration', description: "Dichiara che l'evento è una correzione di un evento precedente errato.", cbv: true },
  epcList: { label: 'EPC List', description: 'Elenco degli identificatori univoci (EPC) degli oggetti coinvolti nell’evento.', cbv: false },
  quantityList: { label: 'Quantity List', description: "Elenco di classi di oggetti con le relative quantità coinvolte nell'evento.", cbv: false },
  childEPCs: { label: 'Child EPCs', description: "Elenco degli EPC figli associati o dissociati nell'evento di aggregazione.", cbv: false },
  parentID: { label: 'Parent ID', description: "L'identificatore dell'oggetto padre in un evento di aggregazione.", cbv: false },
  inputEPCList: { label: 'Input EPC List', description: 'Oggetti utilizzati come input nella trasformazione.', cbv: false },
  inputQuantityList: { label: 'Input Quantity List', description: 'Quantità di classi di oggetti utilizzate come input nella trasformazione.', cbv: false },
  outputEPCList: { label: 'Output EPC List', description: 'Oggetti generati come output dalla trasformazione.', cbv: false },
  outputQuantityList: { label: 'Output Quantity List', description: 'Quantità di classi di oggetti generate come output dalla trasformazione.', cbv: false },
  transformationID: { label: 'Transformation ID', description: 'Identificatore che collega gli eventi di trasformazione appartenenti allo stesso processo.', cbv: false },
  ilmd: { label: 'ILMD', description: 'Instance/Lot Master Data: dati anagrafici aggiuntivi sull’istanza o sul lotto, ad esempio date di produzione e scadenza.', cbv: false },
  sensorElementList: { label: 'Sensor Element List', description: "Elenco dei dati rilevati da sensori associati all'evento.", cbv: false },
  epcClass: { label: 'EPC Class', description: "L'identificatore di classe, non di istanza, dell'oggetto, ad esempio un GTIN.", cbv: false },
  quantity: { label: 'Quantity', description: 'La quantità di oggetti della classe indicata.', cbv: false },
  uom: { label: 'Unit of Measure', description: 'Unità di misura della quantità, ad esempio KGM o GRM.', cbv: false },
  epcisBody: { label: 'EPCIS Body', description: 'Contenitore del payload EPCIS, con l’elenco degli eventi.', cbv: false },
  eventList: { label: 'Event List', description: 'Elenco degli eventi EPCIS contenuti nel documento.', cbv: false },
  schemaVersion: { label: 'Schema Version', description: 'Versione dello schema EPCIS utilizzato dal documento.', cbv: false },
  creationDate: { label: 'Creation Date', description: 'Data e ora di creazione del documento EPCIS.', cbv: false },
  bizTransaction: { label: 'Business Transaction', description: 'L’identificativo (URI) della transazione di business specifica.', cbv: false },
  source: { label: 'Source', description: "L'identificativo (URI) della sorgente specifica: partner o luogo.", cbv: false },
  destination: { label: 'Destination', description: "L'identificativo (URI) della destinazione specifica: partner o luogo.", cbv: false },
  reason: { label: 'Reason', description: 'Il motivo associato, ad esempio per una dichiarazione di errore.', cbv: false },
};

const CONTEXT_OVERRIDES: Record<string, string> = {
  eventList: 'event',
  bizTransactionList: 'bizTransaction',
  sourceList: 'sourceDest',
  destinationList: 'sourceDest',
  set: 'disposition',
  unset: 'disposition',
  errorDeclaration: 'errorDeclaration',
};

export function contextForChildren(key: string | null): string | null {
  if (key === null) {
    return null;
  }
  return CONTEXT_OVERRIDES[key] ?? null;
}

export function lookupValueMeaning(
  key: string | null,
  context: string | null,
  value: string,
): CbvEntry | null {
  const code = normalizeCbvCode(value);

  if (key === 'bizStep') {
    return CBV_BIZSTEPS[code] ?? null;
  }
  if (key === 'disposition') {
    return CBV_DISPOSITIONS[code] ?? null;
  }
  if (key === 'action') {
    return ACTION_MEANINGS[value] ?? null;
  }
  if (key === 'type') {
    if (context === 'event') {
      return EVENT_TYPES[value] ?? null;
    }
    if (context === 'bizTransaction') {
      return CBV_BIZ_TRANSACTION_TYPES[code] ?? null;
    }
    if (context === 'sourceDest') {
      return CBV_SOURCE_DEST_TYPES[code] ?? null;
    }
    return null;
  }
  if (key === 'reason' && context === 'errorDeclaration') {
    return CBV_ERROR_REASONS[code] ?? null;
  }
  if (key === null && context === 'disposition') {
    return CBV_DISPOSITIONS[code] ?? null;
  }
  return null;
}
