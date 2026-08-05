import { Component, computed, input } from '@angular/core';
import { CbvEntry, FIELD_INFO, contextForChildren, lookupValueMeaning } from '../cbv/cbv-vocabulary';
import { InfoTooltip } from './info-tooltip';

interface ChildEntry {
  key: string | null;
  displayKey: string;
  value: unknown;
}

@Component({
  selector: 'app-structure-node',
  standalone: true,
  imports: [InfoTooltip, StructureNode],
  template: `
    @if (children().length) {
      <ul class="space-y-1" [class.pl-4]="depth() > 0" [class.border-l]="depth() > 0" [class.border-gray-100]="depth() > 0">
        @for (child of children(); track child.displayKey + '#' + $index) {
          <li>
            <div class="flex items-start gap-1 flex-wrap py-0.5">
              <span
                class="font-mono text-[12px]"
                [class.text-gs1-blue]="child.key !== null"
                [class.font-semibold]="child.key !== null"
                [class.text-gs1-light-medium-gray]="child.key === null"
              >{{ child.displayKey }}</span>

              @if (fieldInfoFor(child.key); as info) {
                <app-info-tooltip [text]="info.description" [label]="info.label" [variant]="info.cbv ? 'cbv' : 'field'" />
              }

              @if (!isContainer(child.value)) {
                <span class="font-mono text-[12px] text-gs1-medium-gray">:</span>
                <span class="font-mono text-[12px]" [class]="valueClass(child.value)">{{ formatPrimitive(child.value) }}</span>

                @if (valueMeaningFor(child); as meaning) {
                  <app-info-tooltip [text]="meaning.description" [label]="meaning.label" variant="cbv" />
                }
              }
            </div>

            @if (isContainer(child.value)) {
              <app-structure-node [value]="child.value" [ownKey]="child.key" [context]="effectiveContext()" [depth]="depth() + 1" />
            }
          </li>
        }
      </ul>
    } @else if (depth() === 0) {
      <p class="text-sm text-gs1-medium-gray italic">Documento vuoto.</p>
    }
  `,
})
export class StructureNode {
  value = input<unknown>(null);
  ownKey = input<string | null>(null);
  context = input<string | null>(null);
  depth = input(0);

  protected readonly effectiveContext = computed<string | null>(
    () => contextForChildren(this.ownKey()) ?? this.context() ?? null,
  );

  protected readonly children = computed<ChildEntry[]>(() => {
    const v = this.value();
    if (Array.isArray(v)) {
      return v.map((item, i) => ({ key: null, displayKey: `[${i}]`, value: item }));
    }
    if (v !== null && typeof v === 'object') {
      return Object.entries(v as Record<string, unknown>).map(([key, value]) => ({
        key,
        displayKey: key,
        value,
      }));
    }
    return [];
  });

  protected isContainer(value: unknown): boolean {
    return value !== null && typeof value === 'object';
  }

  protected formatPrimitive(value: unknown): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    return String(value);
  }

  protected valueClass(value: unknown): string {
    if (typeof value === 'string') {
      return 'text-gs1-forest';
    }
    if (typeof value === 'number') {
      return 'text-gs1-orange';
    }
    if (typeof value === 'boolean' || value === null) {
      return 'text-purple-600 italic';
    }
    return 'text-gs1-dark-gray';
  }

  protected fieldInfoFor(key: string | null) {
    if (key === null) {
      return null;
    }
    return FIELD_INFO[key] ?? null;
  }

  protected valueMeaningFor(child: ChildEntry): CbvEntry | null {
    if (typeof child.value !== 'string') {
      return null;
    }
    return lookupValueMeaning(child.key, this.effectiveContext(), child.value);
  }
}
