import { FlLogo } from './logo';
import { Component } from '@angular/core';
@Component({
  selector: 'fl-startup',
  imports: [FlLogo],
  template: `<section
    class="startup-screen"
    role="status"
    aria-live="polite"
    aria-label="Preparando FleetLog"
  >
    <fl-logo />
    <p>Preparando sua garagem</p>
    <span class="startup-progress" aria-hidden="true"></span>
  </section>`,
})
export class FlStartup {}
