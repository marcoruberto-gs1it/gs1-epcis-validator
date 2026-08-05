import { Component, input, signal } from '@angular/core';

const TOOLTIP_WIDTH = 260;
const VIEWPORT_MARGIN = 8;
const GAP = 8;
const MIN_SPACE_ABOVE = 90;

@Component({
  selector: 'app-info-tooltip',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center align-middle cursor-help"
      tabindex="0"
      (mouseenter)="show($event)"
      (mouseleave)="hide()"
      (focus)="show($event)"
      (blur)="hide()"
    >
      <svg
        class="h-3.5 w-3.5 shrink-0 text-gs1-medium-gray"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 8a1 1 0 112 0v5a1 1 0 11-2 0V8zm1-4a1.25 1.25 0 100 2.5A1.25 1.25 0 0010 4z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
    @if (visible()) {
      <span
        role="tooltip"
        class="pointer-events-none fixed w-max max-w-[260px] rounded-md bg-gs1-blue-dark text-white text-[12px] leading-snug px-3 py-2 shadow-xl z-[9999]"
        [style]="style()"
      >
        @if (label()) {
          <span class="block font-semibold mb-0.5">{{ label() }}</span>
        }
        {{ text() }}
      </span>
    }
  `,
})
export class InfoTooltip {
  text = input.required<string>();
  label = input<string | null>(null);

  protected readonly visible = signal(false);
  protected readonly style = signal<Record<string, string>>({});

  show(event: Event): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const half = TOOLTIP_WIDTH / 2;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, half + VIEWPORT_MARGIN),
      window.innerWidth - half - VIEWPORT_MARGIN,
    );
    const placeAbove = rect.top > MIN_SPACE_ABOVE;
    const top = placeAbove ? rect.top - GAP : rect.bottom + GAP;

    this.style.set({
      left: `${left}px`,
      top: `${top}px`,
      transform: placeAbove ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
    });
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }
}
