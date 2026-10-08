import { Component, input, output } from '@angular/core';
import { FlBadge } from './badge';
export interface VehicleSummary {
  name: string;
  version: string;
  plate: string;
  km: string;
  color: string;
}
@Component({
  selector: 'fl-vehicle-card',
  imports: [FlBadge],
  templateUrl: './vehicle-card.html',
  styleUrl: './vehicle-card.css',
})
export class FlVehicleCard {
  readonly vehicle = input.required<VehicleSummary>();
  readonly showMileage = input(false);
  readonly activate = output<void>();
}
