# Releases e implantação

## Fluxo

1. Crie uma branch de trabalho e abra PR para `main`. Use Conventional Commits no título e no squash merge (`feat:`, `fix:`, `chore:`). Nunca publique diretamente em `main`.
2. O push resultante de um merge comum executa o Release Please, que abre ou atualiza a proposta de release. Isso não publica versão e não executa o Woodpecker completo. Commits `chore:` isolados podem não gerar proposta até chegar uma alteração publicável.
3. Revise e autorize separadamente o merge do PR de release criado pelo bot. Somente depois desse merge o Release Please publica GitHub Release, notas e tag `vX.Y.Z`.
4. A tag dispara o Woodpecker completo: testes Go com PostgreSQL, `go vet`, build Docker com Angular e publicação no GHCR. Pushes comuns, branches e PRs não passam pelo filtro; os secrets `ghcr_username` e `ghcr_token` continuam exclusivos da publicação.
5. Aguarde o pipeline terminar com sucesso e confira no GHCR as tags `vX.Y.Z`, `sha-COMMIT` (SHA completo do commit da tag) e `main`. `main` só avança em releases. O GitHub Release pode existir antes de a imagem terminar de compilar.
6. O deploy no Dokploy continua manual. Defina `FLEETLOG_IMAGE=ghcr.io/gustabessa/fleetlog:vX.Y.Z` e faça Deploy após aprovação.

`VERSION` e `.release-please-manifest.json` começam em `0.0.0` e representam uma única versão para todo o sistema. A versão em `web/package.json` é metadado privado de desenvolvimento, não um release independente. O tipo `simple` atualiza `VERSION` e `CHANGELOG.md` no PR. Antes de 1.0, `feat` incrementa minor e `fix` incrementa patch. Uma versão proposta ainda não é publicada.

O bootstrap está no commit `457174b15928295e408097ee69cf8c15974367c1`, a main anterior à implementação, pois não havia releases na inspeção. Ele exclui o histórico antigo da primeira proposta. Se a main avançar antes da implantação, ajuste o bootstrap no PR para o commit imediatamente anterior à implantação; depois do primeiro release, o último release passa a ser a referência.

## Configuração externa e validação inicial

- Em GitHub **Settings → Actions → General → Workflow permissions**, confira **Allow GitHub Actions to create and approve pull requests**. O workflow usa `GITHUB_TOKEN` com `contents`, `issues` e `pull-requests: write`. Essa opção administrativa não pôde ser consultada com a integração disponível; a configuração no arquivo não a habilita automaticamente.
- No webhook/App do Woodpecker, confirme recebimento de criação de tags (evento GitHub `create`) e habilitação de eventos `tag` no repositório. No primeiro release autorizado, confira a entrega do webhook e o pipeline com ref `refs/tags/vX.Y.Z`. Essa integração externa não foi validada nesta entrega.
- Recursos criados com `GITHUB_TOKEN` não disparam novos workflows do GitHub Actions. O Woodpecker depende de sua integração externa: não considere a existência da tag prova de entrega ao CI.
- O filtro `refs/tags/v*` também aceita tags manuais e não comprova a origem da tag. Não crie, mova ou exclua tags `v*` manualmente.
- A inspeção encontrou apenas um ruleset de branch, sem proteção de tags. Antes do primeiro release, configure um ruleset ativo de tags `v*`, restringindo criação, atualização e exclusão. Permita criação apenas à identidade efetivamente usada pelo Release Please. Verifique a compatibilidade do bypass com `GITHUB_TOKEN`; não bloqueie o bot nem libere genericamente outros publicadores. Se a plataforma exigir uma identidade de App distinta para essa restrição, revise essa escolha separadamente. Nenhum ruleset foi alterado por esta entrega.

Confirme em um merge comum que há somente proposta, nenhum novo Release/tag e nenhum pipeline completo. No merge autorizado do PR de release, confira a tag, o webhook, o pipeline e as três tags GHCR antes do deploy. Esses testes reais exigem merges autorizados e não são substituídos pela validação estática dos arquivos.

## Falhas e recuperação

- Se o Release Please falhar por permissões, corrija a configuração e reexecute o workflow para o mesmo commit. Confira os PRs/releases existentes antes de qualquer intervenção; não crie uma tag manual como atalho.
- Se testes, build ou publicação falharem, não faça deploy. Corrija causas externas (por exemplo, credenciais do registry) e use **Restart/Rerun** no pipeline de tag existente no Woodpecker. Preserve commit e tag; não mova tags para tentar novamente.
- Se a correção exigir código, faça novo PR e um novo release pelo fluxo normal. Uma imagem parcialmente publicada não torna o release apto ao deploy; confira o pipeline e o digest das tags após a recuperação.
- Para rollback manual, selecione uma imagem versionada anterior e aprovada em `FLEETLOG_IMAGE`. Não mova tags nem use `main` como identificador de rollback.

## Referências

- [Release Please Action v4 e permissões](https://github.com/googleapis/release-please-action/tree/v4)
- [Manifest e bootstrap](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
- [Schema das opções](https://github.com/googleapis/release-please/blob/main/schemas/config.json)
- [Filtros do Woodpecker](https://woodpecker-ci.org/docs/usage/workflow-syntax)
