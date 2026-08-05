import { Component, input } from '@angular/core';

@Component({
  selector: 'app-info-tooltip',
  standalone: true,
  template: `
    <span class="relative inline-flex items-center group/tip align-middle">
      <svg
        class="h-3.5 w-3.5 cursor-help shrink-0"
        [class.text-gs1-orange]="variant() === 'cbv'"
        [class.text-gs1-medium-gray]="variant() !== 'cbv'"
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
      <span
        role="tooltip"
        class="pointer-events-none invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-opacity duration-100 absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-max max-w-[260px] rounded-md bg-gs1-dark-gray text-white text-[11px] leading-snug px-2.5 py-1.5 shadow-lg z-30"
      >
        @if (label()) {
          <span class="block font-semibold mb-0.5">{{ label() }}</span>
        }
        {{ text() }}
      </span>
    </span>
  `,
})
export class InfoTooltip {
  text = input.required<string>();
  label = input<string | null>(null);
  variant = input<'cbv' | 'field'>('field');
}
