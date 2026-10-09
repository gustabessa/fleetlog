import { FlIcon } from '../ui/icon';
import { Confirmation } from '../ui/confirmation';
import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FlCheckbox, FlButton, FlCard, FlField, FlInput } from '../ui';
@Component({
  selector: 'fl-members',
  imports: [FlIcon, FlCheckbox, FormsModule, FlButton, FlCard, FlField, FlInput],
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
    <div class="members-layout">
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
          <fl-checkbox
            ><input name="existing" type="checkbox" [(ngModel)]="existing" /> Usar conta
            existente</fl-checkbox
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
      <div class="member-list">
        <h3>Pessoas com acesso</h3>
        @for (member of members(); track member.id) {
          <article>
            <p>
              {{ member.username }} · {{ member.owner ? 'Criador' : 'Membro' }} ·
              {{ member.oidcLinked ? 'OIDC vinculado' : 'Login local' }}
            </p>
            @if (!member.owner) {
              <button
                flButton
                size="icon"
                [attr.aria-label]="'Remover ' + member.username"
                [attr.title]="'Remover ' + member.username"
                (click)="remove(member.id)"
                [disabled]="busy()"
              >
                <fl-icon name="delete" />
              </button>
            }
          </article>
        }
      </div>
    </div>
  </section>`,
  styles: `
    h2 {
      margin-top: 0;
    }
    .members-layout {
      display: grid;
      grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
      gap: var(--space-8);
      margin-top: var(--space-6);
    }
    .member-list h3 {
      margin-top: 0;
    }
    form button {
      justify-self: start;
    }
    article {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
    article p {
      overflow-wrap: anywhere;
      min-width: 0;
    }
    @media (max-width: 700px) {
      .members-layout {
        grid-template-columns: 1fr;
        gap: var(--space-6);
      }
    }
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
  `,
})
export class Members {
  readonly confirmation = inject(Confirmation);
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
  async remove(id: number) {
    if (
      await this.confirmation.ask(
        'Remover o acesso deste familiar à garagem? O histórico e autoria serão preservados.',
      )
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
