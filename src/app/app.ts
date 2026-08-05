import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EXAMPLE_EVENT } from './example-event';
import { EpcisSchema, EpcisVersion, ValidationOutcome } from './models/validation.model';
import { EpcisValidationService } from './services/epcis-validation.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  rawInput = '';
  schema: EpcisSchema = 'capture';
  version: EpcisVersion = '2.0.0';

  protected readonly loading = signal(false);
  protected readonly outcome = signal<ValidationOutcome | null>(null);

  constructor(private readonly validationService: EpcisValidationService) {}

  validate(): void {
    const document = this.rawInput.trim();
    if (!document || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.outcome.set(null);

    this.validationService.validate(document, this.schema, this.version).subscribe((result) => {
      this.outcome.set(result);
      this.loading.set(false);
    });
  }

  clear(): void {
    this.rawInput = '';
    this.outcome.set(null);
  }

  loadExample(): void {
    this.rawInput = EXAMPLE_EVENT;
    this.outcome.set(null);
  }
}
