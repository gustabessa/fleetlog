import { Component, input, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput, FlVehicleCard } from '../ui';
import { Maintenance } from './maintenance';
import { Fuel } from './fuel';
import { Readings } from './readings';
import { FlDialog } from '../ui/dialog';
import { formatNumber } from '../ui/format';

interface Vehicle {
  id: number;
  garageId: number;
  name: string;
  plate: string;
  brand: string;
  year: number | null;
  chassis: string;
  renavam: string;
  initialKm: string;
  currentKm: string;
}
const emptyForm = () => ({
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
  ],
  templateUrl: './vehicle-garage.html',
  styleUrl: './vehicle-garage.css',
})
export class VehicleGarage {
  readonly currency = input('BRL');
  readonly garageId = input.required<number>();
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
      const response = await fetch(this.endpoint, {
        cache: 'no-store',
        signal: this.requestController.signal,
      });
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
        [vehicle.brand, vehicle.year].filter(Boolean).join(' · ') || 'Informações do veículo',
      plate: vehicle.plate || 'Sem placa informada',
      km: formatNumber(Number(vehicle.currentKm ?? vehicle.initialKm)),
      color: 'teal',
    };
  }
  async open(vehicle: Vehicle) {
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
    } catch {
      if (!this.requestController.signal.aborted)
        this.error.set('Não foi possível abrir o veículo.');
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
  async copy(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(field);
    } catch {
      this.error.set('Não foi possível copiar. Selecione o valor para copiar manualmente.');
    }
  }
}
