import { Component } from '@angular/core';
@Component({
  selector: 'fl-loading',
  template: `<span class="loading" role="status" aria-live="polite"
      ><span class="spinner" aria-hidden="true"></span><span><ng-content /></span></span
    ><span class="loading-track" aria-hidden="true"><i></i></span>`,
  styles: `
    :host {
      display: block;
      min-height: 0;
      padding: 12px 0;
    }
    .loading {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--muted);
      font: var(--font-label);
      padding: 8px 0;
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid color-mix(in srgb, var(--accent) 20%, transparent);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      flex-shrink: 0;
    }
    .loading-track {
      display: block;
      width: min(100%, 320px);
      height: 4px;
      margin-top: 10px;
      border-radius: 8px;
      overflow: hidden;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }
    .loading-track i {
      display: block;
      height: 100%;
      width: 40%;
      border-radius: inherit;
      background: var(--accent);
      animation: loading-sweep 1.5s ease-in-out infinite;
    }
    @keyframes loading-sweep {
      from {
        transform: translateX(-100%);
        opacity: 0.3;
      }
      50% {
        opacity: 0.8;
      }
      to {
        transform: translateX(350%);
        opacity: 0.3;
      }
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .loading-track i {
        animation: none;
        opacity: 0.5;
      }
      .spinner {
        animation: none;
        border-color: var(--accent);
        opacity: 0.7;
      }
    }
  `,
})
export class FlLoading {}
