import { FlIcon } from './icon';
import { FlButton } from './button';
import { Component, input, output, signal } from '@angular/core';
import { FlBadge } from './badge';
export interface VehicleSummary {
  name: string;
  version: string;
  plate: string;
  km: string;
  color: string;
  imageUrl?: string;
  tagColor?: string;
}
@Component({
  selector: 'fl-vehicle-card',
  imports: [FlBadge, FlIcon, FlButton],
  templateUrl: './vehicle-card.html',
  styleUrl: './vehicle-card.css',
})
export class FlVehicleCard {
  readonly vehicle = input.required<VehicleSummary>();
  readonly imageFailed = signal(false);
  ngOnChanges() {
    this.imageFailed.set(false);
  }
  readonly showActions = input(false);
  readonly quick = output<'fuel' | 'service' | 'expense'>();
  readonly showMileage = input(false);
  readonly activate = output<void>();
}
