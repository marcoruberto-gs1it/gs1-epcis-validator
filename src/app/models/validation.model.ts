export interface ValidationError {
  type: string;
  line?: string;
  location?: string;
  column?: string;
  message: string;
}

export type EpcisFormat = 'application/json' | 'application/xml';

export type EpcisSchema = 'capture' | 'query';

export type EpcisVersion = '2.0.0' | '1.2.0';

export type ValidationOutcome =
  | { status: 'valid' }
  | { status: 'invalid'; errors: ValidationError[] }
  | { status: 'network-error'; message: string };
