import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: 'garage/:garageId/vehicles/:vehicleId', children: [] },
  { path: 'garage/:garageId/:section', children: [] },
  { path: 'garage/:garageId', children: [] },
  { path: '**', redirectTo: '' },
];
