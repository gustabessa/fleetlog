import { Component, input, output } from '@angular/core';
import { FlField } from './field';
import { FlInput } from './input';
@Component({
  selector: 'fl-vehicle-select',
  imports: [FlField, FlInput],
  template: `<fl-field [controlId]="controlId()" label="Veículo"
    ><select
      flInput
      [id]="controlId()"
      [value]="value()"
      (change)="valueChange.emit($any($event.target).value)"
    >
      <option value="all">Todos os veículos</option>
      @for (vehicle of vehicles(); track vehicle.plate) {
        <option [value]="vehicle.plate">{{ vehicle.name }} · {{ vehicle.plate }}</option>
      }
    </select></fl-field
  >`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
  `,
})
export class FlVehicleSelect {
  readonly controlId = input.required<string>();
  readonly vehicles = input.required<{ name: string; plate: string }[]>();
  readonly value = input('all');
  readonly valueChange = output<string>();
}
