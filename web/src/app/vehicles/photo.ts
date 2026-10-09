import { Component, input, output, signal } from '@angular/core';
import { FlButton, FlCard } from '../ui';
@Component({
  selector: 'fl-photo',
  imports: [FlButton, FlCard],
  template: `<section flCard>
    <h3>Foto do veículo</h3>
    @if (version()) {
      <img [src]="endpoint() + '?v=' + encode(version())" alt="Foto do veículo" />
    }
    <label
      >Selecionar foto (JPEG, PNG ou WebP, até 10 MB)<input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        [disabled]="busy()"
        (change)="choose($event)"
    /></label>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <button flButton [loading]="busy()" [disabled]="!file" (click)="save()">
      {{ version() ? 'Substituir foto' : 'Salvar foto' }}
    </button>
    @if (version()) {
      <button flButton [disabled]="busy()" (click)="remove()">Remover foto</button>
    }
  </section>`,
  styles: `
    section {
      margin-top: var(--space-5);
      display: grid;
      gap: var(--space-3);
    }
    img {
      width: 100%;
      max-height: 320px;
      object-fit: contain;
      border-radius: var(--radius-control);
    }
    label {
      display: grid;
      gap: var(--space-2);
    }
  `,
})
export class Photo {
  readonly endpoint = input.required<string>();
  readonly initialVersion = input('');
  readonly changed = output<void>();
  readonly version = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  file: File | null = null;
  readonly encode = encodeURIComponent;
  ngOnChanges() {
    this.version.set(this.initialVersion());
  }
  choose(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && file.size > 10 * 1024 * 1024) {
      this.error.set('A foto deve ter até 10 MB.');
      this.file = null;
      return;
    }
    this.file = file;
    this.error.set('');
  }
  async save() {
    if (this.busy() || !this.file) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': this.file.type },
        body: this.file,
      });
      if (!r.ok) {
        this.error.set(
          r.status === 400 || r.status === 413
            ? 'Use uma foto JPEG, PNG ou WebP válida, até 10 MB e 20 megapixels.'
            : 'Não foi possível salvar a foto. Tente novamente.',
        );
        return;
      }
      this.version.set((await r.json()).version);
      this.file = null;
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível salvar a foto.');
    } finally {
      this.busy.set(false);
    }
  }
  async remove() {
    if (this.busy() || !confirm('Remover a foto deste veículo?')) return;
    this.busy.set(true);
    try {
      const r = await fetch(this.endpoint(), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) throw Error();
      this.version.set('');
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível remover a foto.');
    } finally {
      this.busy.set(false);
    }
  }
}
