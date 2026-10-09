import { Component, input, output, signal } from '@angular/core';
import { FlBadge } from './badge';
export interface VehicleSummary {
  name: string;
  version: string;
  plate: string;
  km: string;
  color: string;
  imageUrl?: string;
}
@Component({
  selector: 'fl-vehicle-card',
  imports: [FlBadge],
  templateUrl: './vehicle-card.html',
  styleUrl: './vehicle-card.css',
})
export class FlVehicleCard {
  readonly vehicle = input.required<VehicleSummary>();
  readonly imageFailed = signal(false);
  ngOnChanges() {
    this.imageFailed.set(false);
  }
  readonly showMileage = input(false);
  readonly activate = output<void>();
}
