import { Component, computed, ElementRef, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { formatJson, formatXml, highlightJson } from './document-format';
import { EXAMPLE_EVENT } from './example-event';
import { EpcisSchema, EpcisVersion, ValidationOutcome } from './models/validation.model';
import { detectFormat, EpcisValidationService } from './services/epcis-validation.service';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly rawInput = signal('');
  schema: EpcisSchema = 'capture';
  version: EpcisVersion = '2.0.0';

  protected readonly loading = signal(false);
  protected readonly outcome = signal<ValidationOutcome | null>(null);
  protected readonly formatError = signal<string | null>(null);

  protected readonly highlightedInput = computed(() => highlightJson(this.rawInput()));

  private readonly highlightLayer = viewChild<ElementRef<HTMLElement>>('highlightLayer');

  constructor(private readonly validationService: EpcisValidationService) {}

  onInputChange(value: string): void {
    this.rawInput.set(value);
    this.formatError.set(null);
  }

  syncScroll(textarea: HTMLTextAreaElement): void {
    const layer = this.highlightLayer()?.nativeElement;
    if (!layer) {
      return;
    }
    layer.scrollTop = textarea.scrollTop;
    layer.scrollLeft = textarea.scrollLeft;
  }

  formatInput(): void {
    const current = this.rawInput().trim();
    if (!current) {
      return;
    }

    try {
      const formatted =
        detectFormat(current) === 'application/json' ? formatJson(current) : formatXml(current);
      this.rawInput.set(formatted);
      this.formatError.set(null);
    } catch {
      this.formatError.set('Contenuto non valido: impossibile formattare.');
    }
  }

  validate(): void {
    const document = this.rawInput().trim();
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
    this.rawInput.set('');
    this.outcome.set(null);
    this.formatError.set(null);
  }

  loadExample(): void {
    this.rawInput.set(EXAMPLE_EVENT);
    this.outcome.set(null);
    this.formatError.set(null);
  }
}
