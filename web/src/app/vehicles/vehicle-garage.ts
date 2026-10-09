import { FlIcon } from '../ui/icon';
import { Confirmation } from '../ui/confirmation';
import { Component, inject, input, signal, viewChild, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlCheckbox, FlButton, FlCard, FlField, FlInput, FlVehicleCard } from '../ui';
import { VehicleRecords } from './records';
import { Photo } from './photo';
import { Maintenance } from './maintenance';
import { Fuel } from './fuel';
import { Readings } from './readings';
import { FlDialog } from '../ui/dialog';
import { formatNumber } from '../ui/format';

interface Vehicle {
  id: number;
  garageId: number;
  tagColor: string;
  name: string;
  plate: string;
  brand: string;
  year: number | null;
  chassis: string;
  renavam: string;
  initialKm: string;
  currentKm: string;
  imageVersion: string;
  archived: boolean;
}
const emptyForm = () => ({
  tagColor: '#087e83',
  name: '',
  plate: '',
  brand: '',
  year: null as number | null,
  chassis: '',
  renavam: '',
  initialKm: null as number | null,
});

@Component({
  selector: 'fl-vehicle-garage',
  imports: [
    FlIcon,
    FlCheckbox,
    FormsModule,
    FlButton,
    FlCard,
    FlField,
    FlInput,
    FlVehicleCard,
    FlDialog,
    Readings,
    Fuel,
    Maintenance,
    Photo,
    VehicleRecords,
  ],
  templateUrl: './vehicle-garage.html',
  styleUrl: './vehicle-garage.css',
})
export class VehicleGarage {
  readonly confirmation = inject(Confirmation);
  readonly vehicleId = input<number | null>(null);
  readonly navigate = output<number | null>();
  readonly currency = input('BRL');
  readonly garageId = input.required<number>();
  readonly quick = signal<{ vehicle: Vehicle; kind: 'fuel' | 'service' | 'expense' } | null>(null);
  quickDone() {
    this.quick.set(null);
    void this.load();
  }
  readonly dataRevision = signal(0);
  readonly includeArchived = signal(false);
  readonly vehicles = signal<Vehicle[]>([]);
  readonly selected = signal<Vehicle | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly formError = signal('');
  readonly copied = signal('');
  readonly editor = viewChild.required<FlDialog>('editor');
  form = emptyForm();
  editing: number | null = null;
  private readonly requestController = new AbortController();
  ngOnChanges() {
    const id = this.vehicleId();
    if (id) void this.open({ id } as Vehicle, false);
    else this.selected.set(null);
  }
  ngOnInit() {
    void this.load();
  }
  ngOnDestroy() {
    this.requestController.abort();
  }
  get endpoint() {
    return `/api/garages/${this.garageId()}/vehicles`;
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await fetch(
        this.endpoint + (this.includeArchived() ? '?includeArchived=true' : ''),
        {
          cache: 'no-store',
          signal: this.requestController.signal,
        },
      );
      if (!response.ok) {
        this.error.set('Não foi possível carregar os veículos.');
        return;
      }
      this.vehicles.set(await response.json());
    } catch {
      if (!this.requestController.signal.aborted)
        this.error.set('Não foi possível carregar os veículos.');
    } finally {
      this.loading.set(false);
    }
  }
  number(value: string) {
    return formatNumber(Number(value));
  }
  summary(vehicle: Vehicle) {
    return {
      name: vehicle.name,
      version:
        [vehicle.brand, vehicle.year, vehicle.archived ? 'Arquivado' : '']
          .filter(Boolean)
          .join(' · ') || 'Informações do veículo',
      plate: vehicle.plate || 'Sem placa informada',
      km: formatNumber(Number(vehicle.currentKm ?? vehicle.initialKm)),
      tagColor: vehicle.tagColor,
      color: 'teal',
      imageUrl: vehicle.imageVersion
        ? `${this.endpoint}/${vehicle.id}/image?v=${encodeURIComponent(vehicle.imageVersion)}`
        : '',
    };
  }
  async open(vehicle: Vehicle, updateURL = true) {
    this.error.set('');
    this.copied.set('');
    try {
      const response = await fetch(`${this.endpoint}/${vehicle.id}`, {
        cache: 'no-store',
        signal: this.requestController.signal,
      });
      if (!response.ok) {
        this.error.set('Não foi possível abrir o veículo.');
        return;
      }
      this.selected.set(await response.json());
      if (updateURL) this.navigate.emit(vehicle.id);
    } catch {
      if (!this.requestController.signal.aborted)
        this.error.set('Não foi possível abrir o veículo.');
    }
  }
  async refreshSelected() {
    const vehicle = this.selected();
    if (!vehicle) return;
    try {
      const [detail, list] = await Promise.all([
        fetch(`${this.endpoint}/${vehicle.id}`, {
          cache: 'no-store',
          signal: this.requestController.signal,
        }),
        fetch(this.endpoint + (this.includeArchived() ? '?includeArchived=true' : ''), {
          cache: 'no-store',
          signal: this.requestController.signal,
        }),
      ]);
      if (!detail.ok || !list.ok) throw Error();
      this.selected.set(await detail.json());
      this.vehicles.set(await list.json());
      this.dataRevision.update((n) => n + 1);
    } catch {
      if (!this.requestController.signal.aborted)
        this.error.set('Não foi possível atualizar os dados do veículo.');
    }
  }
  startCreate() {
    if (this.busy()) return;
    this.editing = null;
    this.form = emptyForm();
    this.formError.set('');
    this.editor().show();
  }
  startEdit(vehicle: Vehicle) {
    if (this.busy()) return;
    this.editing = vehicle.id;
    this.form = {
      tagColor: vehicle.tagColor,
      name: vehicle.name,
      plate: vehicle.plate,
      brand: vehicle.brand,
      year: vehicle.year,
      chassis: vehicle.chassis,
      renavam: vehicle.renavam,
      initialKm: Number(vehicle.initialKm),
    };
    this.formError.set('');
    this.editor().show();
  }
  async save() {
    if (this.busy()) return;
    this.busy.set(true);
    this.formError.set('');
    const editing = this.editing;
    const { initialKm, ...details } = this.form;
    const body = editing === null ? { ...details, initialKm } : details;
    try {
      const response = await fetch(
        editing === null ? this.endpoint : `${this.endpoint}/${editing}`,
        {
          method: editing === null ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: this.requestController.signal,
        },
      );
      if (!response.ok) {
        this.formError.set(
          response.status === 400
            ? 'Confira os campos. O nome é obrigatório e o km inicial deve ser positivo ou zero, com até três casas decimais.'
            : response.status === 403
              ? 'Você não tem permissão para salvar este veículo.'
              : 'Não foi possível salvar. Tente novamente.',
        );
        return;
      }
      const vehicle: Vehicle = await response.json();
      this.vehicles.update((vehicles) =>
        editing === null
          ? [...vehicles, vehicle]
          : vehicles.map((current) => (current.id === vehicle.id ? vehicle : current)),
      );
      if (this.selected()) this.selected.set(vehicle);
      this.copied.set('');
      this.editor().close();
    } catch {
      if (!this.requestController.signal.aborted)
        this.formError.set('Não foi possível salvar. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
  }
  async toggleArchive(vehicle: Vehicle) {
    if (this.busy()) return;
    const message = vehicle.archived
      ? 'Desarquivar este veículo e voltar a mostrá-lo na garagem ativa?'
      : 'Arquivar este veículo? Notas, fotos e lançamentos serão preservados.';
    if (!(await this.confirmation.ask(message))) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const response = await fetch(`${this.endpoint}/${vehicle.id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !vehicle.archived }),
      });
      if (!response.ok) throw Error();
      await this.refreshSelected();
    } catch {
      this.error.set('Não foi possível alterar o arquivamento.');
    } finally {
      this.busy.set(false);
    }
  }
  async copy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(field);
    } catch {
      this.error.set('Não foi possível copiar. Selecione o valor para copiar manualmente.');
    }
  }
}
