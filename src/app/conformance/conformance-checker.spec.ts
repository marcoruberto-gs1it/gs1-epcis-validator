import { describe, expect, it } from 'vitest';
import { checkConformance, Finding, hasValidCheckDigit } from './conformance-checker';

const CTX = 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld';

function doc(event: Record<string, unknown>, extraContext: Record<string, string>[] = []) {
  return {
    '@context': [CTX, ...extraContext],
    type: 'EPCISDocument',
    schemaVersion: '2.0',
    creationDate: '2026-09-25T07:42:05.000Z',
    epcisBody: { eventList: [event] },
  };
}

const goodEvent = {
  type: 'ObjectEvent',
  eventID: 'urn:uuid:3f6c2a9e-8b41-4d2f-9c7a-5e1b0d4a7f23',
  eventTime: '2026-09-25T07:42:00.000Z',
  eventTimeZoneOffset: '+02:00',
  action: 'ADD',
  bizStep: 'commissioning',
  disposition: 'active',
  epcList: ['https://id.gs1.org/01/04012345123456/21/SERIAL001'],
  readPoint: { id: 'https://id.gs1.org/414/4012345000009/254/1' },
  bizLocation: { id: 'https://id.gs1.org/414/4012345000009' },
};

function messages(findings: Finding[], severity?: Finding['severity']): string[] {
  return findings.filter((f) => !severity || f.severity === severity).map((f) => f.message);
}

describe('hasValidCheckDigit', () => {
  it('riconosce cifre di controllo corrette ed errate', () => {
    expect(hasValidCheckDigit('04012345123456')).toBe(true);
    expect(hasValidCheckDigit('04012345123457')).toBe(false);
    expect(hasValidCheckDigit('4012345000009')).toBe(true);
  });
});

describe('checkConformance', () => {
  it('non segnala nulla per un evento completo e conforme', () => {
    expect(checkConformance(doc(goodEvent))).toEqual([]);
  });

  it('segnala valori CBV non validi e suggerisce quello corretto', () => {
    const findings = checkConformance(doc({ ...goodEvent, bizStep: 'comissioning' }));
    const err = findings.find((f) => f.path.endsWith('.bizStep'));
    expect(err?.severity).toBe('errore');
    expect(err?.suggestion).toContain('commissioning');
  });

  it('accetta valori CBV in forma URN e URI ref.gs1.org, suggerendo la forma breve per le URN', () => {
    const urn = checkConformance(doc({ ...goodEvent, bizStep: 'urn:epcglobal:cbv:bizstep:commissioning' }));
    expect(urn.map((f) => f.severity)).toEqual(['info']);
    const uri = checkConformance(doc({ ...goodEvent, disposition: 'https://ref.gs1.org/cbv/Disp-active' }));
    expect(uri).toEqual([]);
  });

  it('tratta un URI privato come avviso, non come errore', () => {
    const findings = checkConformance(doc({ ...goodEvent, bizStep: 'https://acme.example.it/bizstep/sorting' }));
    expect(messages(findings, 'errore')).toEqual([]);
    expect(messages(findings, 'avviso').some((m) => m.includes('valore privato'))).toBe(true);
  });

  it('verifica la cifra di controllo nei Digital Link', () => {
    const findings = checkConformance(
      doc({ ...goodEvent, epcList: ['https://id.gs1.org/01/04012345123457/21/1'] }),
    );
    expect(messages(findings, 'errore').some((m) => m.includes('cifra di controllo del GTIN'))).toBe(true);
  });

  it('segnala un GTIN senza seriale in epcList', () => {
    const findings = checkConformance(doc({ ...goodEvent, epcList: ['https://id.gs1.org/01/04012345123456'] }));
    expect(messages(findings, 'avviso').some((m) => m.includes('classe di prodotto'))).toBe(true);
  });

  it('segnala prefissi di estensione non dichiarati in @context', () => {
    const findings = checkConformance(doc({ ...goodEvent, 'acme:grade': 'B' }));
    expect(messages(findings, 'errore').some((m) => m.includes('"acme"'))).toBe(true);
  });

  it('segnala l’abbinamento azione/bizStep errato e l’ILMD fuori da ADD', () => {
    const findings = checkConformance(doc({ ...goodEvent, action: 'OBSERVE', ilmd: {} }));
    const errs = messages(findings);
    expect(errs.some((m) => m.includes('richiede action "ADD"'))).toBe(true);
    expect(errs.some((m) => m.includes('ILMD'))).toBe(true);
  });

  it('richiede uom per quantità decimali e codici UN/ECE validi', () => {
    const findings = checkConformance(
      doc({
        ...goodEvent,
        epcList: undefined,
        quantityList: [
          { epcClass: 'https://id.gs1.org/01/04012345123456/10/L1', quantity: 2.5 },
          { epcClass: 'https://id.gs1.org/01/04012345123456', quantity: 3, uom: 'kg' },
        ],
      }),
    );
    const errs = messages(findings, 'errore');
    expect(errs.some((m) => m.includes('decimale'))).toBe(true);
    expect(errs.some((m) => m.includes('"kg"'))).toBe(true);
  });

  it('segnala eventID duplicati', () => {
    const d = doc(goodEvent);
    d.epcisBody.eventList.push({ ...goodEvent });
    expect(messages(checkConformance(d), 'errore').some((m) => m.includes('duplicato'))).toBe(true);
  });

  it('analizza l’evento di cernita tessile con estensioni', () => {
    const findings = checkConformance(
      doc(
        {
          type: 'ObjectEvent',
          eventID: 'urn:uuid:3f6c2a9e-8b41-4d2f-9c7a-5e1b0d4a7f23',
          eventTime: '2026-09-25T07:42:00.000Z',
          eventTimeZoneOffset: '+02:00',
          action: 'OBSERVE',
          bizStep: 'inspecting',
          epcList: ['https://id.gs1.org/01/04012345123456/21/SERIAL001'],
          bizLocation: { id: 'urn:atma.io:loc:anatomy:ExampleSortingHannover' },
          'tex:sortingCompany': { 'cbvmda:name': 'Example Textile Sorting GmbH' },
          'tex:conditionGrade': 'B',
          'tex:sortingDecision': 'tex:ReUse',
        },
        [{ tex: 'https://example.org/ns/tex/' }],
      ),
    );
    expect(messages(findings, 'errore')).toEqual([]);
    const paths = findings.map((f) => f.path);
    expect(paths).toContain('@context.tex');
    expect(paths).toContain('epcisBody.eventList[0].bizLocation.id');
    expect(paths).toContain('epcisBody.eventList[0].disposition');
    expect(paths).toContain('epcisBody.eventList[0].readPoint');
  });
});
