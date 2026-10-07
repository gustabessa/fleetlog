import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly updateReady = signal(false);
  readonly updateBroken = signal(false);
  private readonly updates = inject(SwUpdate);
  readonly dark = signal(
    localStorage.getItem('fleetlog.theme') === 'dark' ||
      (!localStorage.getItem('fleetlog.theme') &&
        matchMedia('(prefers-color-scheme: dark)').matches),
  );
  constructor() {
    this.applyTheme();
    if (this.updates.isEnabled) {
      this.updates.versionUpdates.pipe(takeUntilDestroyed()).subscribe((event) => {
        if (event.type === 'VERSION_READY') this.updateReady.set(true);
      });
      this.updates.unrecoverable
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.updateBroken.set(true));
    }
  }
  reload() {
    location.reload();
  }
  toggleTheme() {
    this.dark.update((value) => !value);
    localStorage.setItem('fleetlog.theme', this.dark() ? 'dark' : 'light');
    this.applyTheme();
  }
  private applyTheme() {
    document.documentElement.dataset['theme'] = this.dark() ? 'dark' : 'light';
  }
}
