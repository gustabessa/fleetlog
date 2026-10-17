import { Confirmation } from '../ui/confirmation';
import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FlButton, FlCard, FlSlider } from '../ui';
@Component({
  selector: 'fl-photo',
  imports: [FlButton, FlCard, FlSlider],
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
    @if (preview()) {
      <h4>Enquadramento na garagem</h4>
      <p>Ajuste o zoom e a posição. A prévia mostra o recorte que será salvo.</p>
      <canvas
        #previewCanvas
        width="1024"
        height="1024"
        aria-label="Prévia do enquadramento"
      ></canvas>
      <fl-slider
        label="Zoom"
        [min]="1"
        [max]="3"
        [step]="0.01"
        [(value)]="zoom"
        suffix="×"
        [disabled]="busy()"
      />
      <fl-slider
        label="Posição horizontal"
        [min]="0"
        [max]="100"
        [step]="1"
        [(value)]="horizontal"
        suffix="%"
        [disabled]="busy()"
      />
      <fl-slider
        label="Posição vertical"
        [min]="0"
        [max]="100"
        [step]="1"
        [(value)]="vertical"
        suffix="%"
        [disabled]="busy()"
      />
      <button flButton [disabled]="busy()" (click)="cancel()">Cancelar enquadramento</button>
    }
    @if (version() && !preview()) {
      <button flButton [disabled]="busy()" (click)="edit()">Ajustar enquadramento</button>
    }
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    <button flButton [loading]="busy()" [disabled]="!preview()" (click)="save()">
      {{ version() ? 'Salvar enquadramento' : 'Salvar foto' }}
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
    canvas {
      width: 100%;
      max-width: 340px;
      aspect-ratio: 1;
      border-radius: var(--radius-control);
    }
    label {
      display: grid;
      gap: var(--space-2);
    }
  `,
})
export class Photo {
  readonly confirmation = inject(Confirmation);
  readonly endpoint = input.required<string>();
  readonly initialVersion = input('');
  readonly changed = output<void>();
  readonly version = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly preview = signal<HTMLImageElement | null>(null);
  readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('previewCanvas');
  readonly zoom = signal(1);
  readonly horizontal = signal(50);
  readonly vertical = signal(50);
  private selection = 0;
  readonly encode = encodeURIComponent;
  constructor() {
    // The conditional canvas must exist before painting; track slider changes too.
    afterRenderEffect(() => {
      const canvas = this.canvas()?.nativeElement;
      if (canvas && this.preview()) this.draw(canvas);
    });
  }
  ngOnChanges() {
    this.version.set(this.initialVersion());
  }
  async choose(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('A foto deve ter até 10 MB.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.error.set('Use uma foto JPEG, PNG ou WebP.');
      return;
    }
    this.busy.set(true);
    try {
      await this.load(file);
    } finally {
      this.busy.set(false);
    }
  }
  async edit() {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint() + '?v=' + this.encode(this.version()));
      if (!r.ok) throw Error();
      await this.load(await r.blob());
    } catch {
      this.error.set('Não foi possível abrir a foto. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
  }
  private async load(blob: Blob) {
    const selection = ++this.selection;
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (selection !== this.selection) return;
      if (img.naturalWidth * img.naturalHeight > 20_000_000) {
        this.error.set('A foto deve ter até 20 megapixels.');
        return;
      }
      this.zoom.set(1);
      this.horizontal.set(50);
      this.vertical.set(50);
      this.preview.set(img);
      this.error.set('');
    } catch {
      if (selection === this.selection) this.error.set('Não foi possível abrir esta foto.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  private draw(canvas: HTMLCanvasElement) {
    const img = this.preview();
    const ctx = canvas.getContext('2d');
    if (!img || !ctx) return;
    const size = canvas.width;
    const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight) * this.zoom();
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(
      img,
      ((size - width) * this.horizontal()) / 100,
      ((size - height) * this.vertical()) / 100,
      width,
      height,
    );
  }
  cancel() {
    ++this.selection;
    this.preview.set(null);
    this.error.set('');
  }
  async save() {
    if (this.busy() || !this.preview()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      this.draw(canvas);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((value) => (value ? resolve(value) : reject(Error())), 'image/jpeg', 0.92),
      );
      const r = await fetch(this.endpoint(), {
        method: 'PUT',
        headers: { 'Content-Type': blob.type },
        body: blob,
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
      this.cancel();
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível salvar a foto.');
    } finally {
      this.busy.set(false);
    }
  }
  async remove() {
    if (this.busy() || !(await this.confirmation.ask('Remover a foto deste veículo?'))) return;
    this.busy.set(true);
    try {
      const r = await fetch(this.endpoint(), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!r.ok) throw Error();
      this.version.set('');
      this.cancel();
      this.changed.emit();
    } catch {
      this.error.set('Não foi possível remover a foto.');
    } finally {
      this.busy.set(false);
    }
  }
}
