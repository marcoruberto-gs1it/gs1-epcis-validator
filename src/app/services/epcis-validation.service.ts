import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {
  EpcisFormat,
  EpcisSchema,
  EpcisVersion,
  ValidationError,
  ValidationOutcome,
} from '../models/validation.model';

export function detectFormat(raw: string): EpcisFormat {
  return raw.trim().startsWith('<') ? 'application/xml' : 'application/json';
}

@Injectable({ providedIn: 'root' })
export class EpcisValidationService {
  private readonly endpoint = 'https://tools.openepcis.io/api/events/validate';

  constructor(private readonly http: HttpClient) {}

  validate(
    document: string,
    schema: EpcisSchema,
    version: EpcisVersion,
  ): Observable<ValidationOutcome> {
    const contentType = detectFormat(document);

    return this.http
      .post(this.endpoint, document, {
        params: { epcisDocumentSchema: schema },
        headers: {
          'Content-Type': contentType,
          'GS1-EPCIS-Version': version,
        },
        observe: 'response',
        responseType: 'text',
      })
      .pipe(
        map(() => ({ status: 'valid' }) as ValidationOutcome),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 400 && typeof err.error === 'string') {
            try {
              const errors = JSON.parse(err.error) as ValidationError[];
              return of({ status: 'invalid', errors } as ValidationOutcome);
            } catch {
              return of({
                status: 'network-error',
                message: 'Risposta del server non interpretabile.',
              } as ValidationOutcome);
            }
          }

          if (err.status === 0) {
            return of({
              status: 'network-error',
              message:
                'Impossibile contattare il servizio di validazione online (tools.openepcis.io).',
            } as ValidationOutcome);
          }

          return of({
            status: 'network-error',
            message: `Errore inatteso dal server (HTTP ${err.status}).`,
          } as ValidationOutcome);
        }),
      );
  }
}
