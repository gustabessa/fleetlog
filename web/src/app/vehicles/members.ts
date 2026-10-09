import { Component, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlButton, FlCard, FlField, FlInput } from '../ui';
@Component({
  selector: 'fl-members',
  imports: [FormsModule, FlButton, FlCard, FlField, FlInput],
  template: `<section flCard>
    <h2>Familiares da garagem</h2>
    <p>Membros podem cadastrar, editar e excluir dados. Somente o criador administra acessos.</p>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button flButton (click)="load()">Recarregar membros</button>
    }
    @if (loading()) {
      <p role="status">Carregando membros…</p>
    }
    <form ngNativeValidate (ngSubmit)="add()">
      <fieldset [disabled]="busy()">
        <fl-field controlId="member-user" label="Usuário do familiar"
          ><input
            flInput
            id="member-user"
            name="username"
            [(ngModel)]="username"
            required
            maxlength="64"
            autocomplete="off"
        /></fl-field>
        <label
          ><input name="existing" type="checkbox" [(ngModel)]="existing" /> Usar conta
          existente</label
        >
        @if (!existing) {
          <fl-field
            controlId="member-password"
            label="Senha inicial"
            hint="De 12 a 72 bytes. O familiar poderá vincular OIDC no próprio perfil."
            ><input
              flInput
              id="member-password"
              name="password"
              [(ngModel)]="password"
              type="password"
              required
              minlength="12"
              maxlength="72"
              autocomplete="new-password"
          /></fl-field>
        }
        <button flButton type="submit" [loading]="busy()">Adicionar familiar</button>
      </fieldset>
    </form>
    @for (member of members(); track member.id) {
      <article>
        <p>
          {{ member.username }} · {{ member.owner ? 'Criador' : 'Membro' }} ·
          {{ member.oidcLinked ? 'OIDC vinculado' : 'Login local' }}
        </p>
        @if (!member.owner) {
          <button flButton (click)="remove(member.id)" [disabled]="busy()">
            Remover {{ member.username }}
          </button>
        }
      </article>
    }
  </section>`,
  styles: `
    fieldset {
      border: 0;
      padding: 0;
      display: grid;
      gap: var(--space-3);
    }
    article {
      border-top: 1px solid var(--line);
      margin-top: var(--space-4);
    }
    button {
      margin: var(--space-2);
    }
  `,
})
export class Members {
  readonly garageId = input.required<number>();
  readonly members = signal<
    { id: number; username: string; owner: boolean; oidcLinked: boolean }[]
  >([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  username = '';
  password = '';
  existing = false;
  private get endpoint() {
    return `/api/garages/${this.garageId()}/members`;
  }
  ngOnInit() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const r = await fetch(this.endpoint, { cache: 'no-store' });
      if (!r.ok) throw Error();
      this.members.set(await r.json());
    } catch {
      this.error.set('Não foi possível carregar membros.');
    } finally {
      this.loading.set(false);
    }
  }
  add() {
    return this.mutate(this.endpoint, 'POST', {
      username: this.username,
      password: this.existing ? '' : this.password,
      existing: this.existing,
    });
  }
  remove(id: number) {
    if (
      confirm('Remover o acesso deste familiar à garagem? O histórico e autoria serão preservados.')
    )
      void this.mutate(this.endpoint + '/' + id, 'DELETE', {});
  }
  private async mutate(url: string, method: string, body: object) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        this.error.set(
          r.status === 409
            ? 'Esse usuário já existe. Escolha usar conta existente.'
            : r.status === 400
              ? 'Confira usuário e senha inicial (12 a 72 bytes).'
              : 'Não foi possível alterar membros.',
        );
        return;
      }
      this.members.set(await r.json());
      this.username = '';
    } catch {
      this.error.set('Não foi possível alterar membros.');
    } finally {
      this.password = '';
      this.busy.set(false);
    }
  }
}
