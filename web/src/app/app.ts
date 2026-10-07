import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({selector: 'app-root', imports: [RouterOutlet], templateUrl: './app.html', styleUrl: './app.css'})
export class App {
  readonly dark = signal(localStorage.getItem('fleetlog.theme') === 'dark' || (!localStorage.getItem('fleetlog.theme') && matchMedia('(prefers-color-scheme: dark)').matches));
  constructor() { this.applyTheme(); }
  toggleTheme() { this.dark.update(value => !value); localStorage.setItem('fleetlog.theme', this.dark() ? 'dark' : 'light'); this.applyTheme(); }
  private applyTheme() { document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light'; }
}
