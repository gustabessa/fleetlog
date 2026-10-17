# Releases e implantação

## Fluxo

1. Crie uma branch de trabalho e abra PR para `main`. Use Conventional Commits no título e no squash merge (`feat:`, `fix:`, `chore:`). Nunca publique diretamente em `main`.
2. O push resultante de um merge comum executa o pipeline leve `.woodpecker/release.yaml` com a CLI Release Please 17.11.2 (Node 22), que abre ou atualiza a proposta de release. Isso não publica versão e não executa o Woodpecker completo. Commits `chore:` isolados podem não gerar proposta até chegar uma alteração publicável.
3. Revise e autorize separadamente o merge do PR de release criado pelo bot. Somente depois desse merge o Release Please publica GitHub Release, notas e tag `vX.Y.Z`.
4. A tag dispara o Woodpecker completo: testes Go com PostgreSQL, `go vet`, build Docker com Angular e publicação no GHCR. Pushes comuns, branches e PRs não passam pelo filtro do build completo; os secrets `ghcr_username` e `ghcr_token` continuam exclusivos da publicação.
5. Aguarde o pipeline terminar com sucesso e confira no GHCR as tags `vX.Y.Z`, `sha-COMMIT` (SHA completo do commit da tag) e `main`. `main` só avança em releases. O GitHub Release pode existir antes de a imagem terminar de compilar.
6. O deploy no Dokploy continua manual. Defina `FLEETLOG_IMAGE=ghcr.io/gustabessa/fleetlog:vX.Y.Z` e faça Deploy após aprovação.

`VERSION` e `.release-please-manifest.json` começam em `0.0.0` e representam uma única versão para todo o sistema. A versão em `web/package.json` é metadado privado de desenvolvimento, não um release independente. O tipo `simple` atualiza `VERSION` e `CHANGELOG.md` no PR. Antes de 1.0, `feat` incrementa minor e `fix` incrementa patch. A primeira proposta é explicitamente `0.1.0` (`initial-version`), pois já inclui uma funcionalidade; sem essa opção, o tipo `simple` escolheria `1.0.0` na ausência de releases anteriores, mesmo com manifest `0.0.0`. Depois do primeiro release, os incrementos seguem a versão publicada. Uma versão proposta ainda não é publicada.

O bootstrap está no commit `457174b15928295e408097ee69cf8c15974367c1`, a main anterior à implementação, pois não havia releases na inspeção. Ele exclui o histórico antigo da primeira proposta. A migração do executor para Woodpecker preserva esse bootstrap para manter as funcionalidades já mescladas na primeira proposta. Depois do primeiro release, o último release passa a ser a referência.

## Configuração externa e validação inicial

O workflow do GitHub Actions foi removido; não é necessário habilitar a criação de PRs pelo Actions para este fluxo. A configuração do manifest, a branch de proposta já criada e o histórico são preservados. Não execute o workflow antigo em paralelo durante a migração.

1. Crie um **fine-grained personal access token** no GitHub, com o usuário proprietário correto e acesso somente ao repositório `gustabessa/fleetlog`. Permissões de repositório: **Contents: Read and write**, **Pull requests: Read and write** e **Issues: Read and write** (labels `autorelease:*`). Metadata permanece em leitura. Defina validade e renove antes de expirar. Não cole o token em arquivos, PRs ou logs.
2. No Woodpecker, abra **FleetLog → Settings → Secrets** e adicione `release_please_token`. Habilite somente o evento **push**, sem `pull_request`, `tag` ou eventos de deploy. Esse é um novo secret da automação de release; não substitui o token de login do Woodpecker, as credenciais da integração GitHub nem `ghcr_username`/`ghcr_token`. Não reutilize o token do GHCR.
3. Confira que o repositório usa a pasta `.woodpecker/` como configuração, descobrindo tanto `release.yaml` quanto `build.yaml`, e que eventos `push` e `tag` estão habilitados. Para evitar execuções concorrentes modificando a proposta, configure o limite de pipelines simultâneos do repositório como **1**, sem cancelar o pipeline em andamento quando chegar um novo push na main.
4. O webhook GitHub do Woodpecker deve receber **push**, inclusive para refs de tag. O adaptador GitHub do Woodpecker converte `push` com ref `refs/tags/*` em evento interno `tag`; não exige assinatura separada do evento GitHub `create`. Na inspeção, o webhook estava ativo e incluía `push`. Isso confirma a assinatura, não a entrega e execução de um release real.
5. Cadastre o secret antes de mesclar a migração. Depois do merge, confirme execução somente de `release.yaml` e criação/atualização do PR de proposta. A CLI executa primeiro `github-release` (publica apenas propostas já mescladas) e depois `release-pr` (abre/atualiza proposta). Na ausência de PR de release mesclado, o primeiro comando não publica versão. Ambos consultam a main no GitHub e usam o manifest existente.
6. A primeira execução pode reaproveitar a branch `release-please--branches--main` deixada pela tentativa anterior. Não a apague nem crie tags manualmente como preparação. Confira o conteúdo e a versão da proposta antes de autorizar seu merge.

- O filtro `refs/tags/v*` também aceita tags manuais e não comprova a origem da tag. Não crie, mova ou exclua tags `v*` manualmente.
- A inspeção encontrou apenas um ruleset de branch, sem proteção de tags. Antes do primeiro release, configure um ruleset ativo de tags `v*`, restringindo criação, atualização e exclusão. Permita criação apenas à identidade efetivamente usada pelo Release Please. Verifique a compatibilidade do bypass com a identidade do token dedicado; não bloqueie o bot nem libere genericamente outros publicadores. Se a plataforma exigir uma identidade de App distinta para essa restrição, revise essa escolha separadamente. Nenhum ruleset foi alterado por esta entrega.

Confirme em um merge comum que há somente proposta, nenhum novo Release/tag e nenhum pipeline completo. No merge autorizado do PR de release, confira a tag, o webhook, o pipeline e as três tags GHCR antes do deploy. Esses testes reais exigem merges autorizados e não são substituídos pela validação estática dos arquivos.

## Falhas e recuperação

- Se o Release Please falhar por permissões, corrija a configuração e reexecute o pipeline leve do Woodpecker para o mesmo commit. Confira os PRs/releases existentes antes de qualquer intervenção; não crie uma tag manual como atalho.
- Se testes, build ou publicação falharem, não faça deploy. Corrija causas externas (por exemplo, credenciais do registry) e use **Restart/Rerun** no pipeline de tag existente no Woodpecker. Preserve commit e tag; não mova tags para tentar novamente.
- Se a correção exigir código, faça novo PR e um novo release pelo fluxo normal. Uma imagem parcialmente publicada não torna o release apto ao deploy; confira o pipeline e o digest das tags após a recuperação.
- Para rollback manual, selecione uma imagem versionada anterior e aprovada em `FLEETLOG_IMAGE`. Não mova tags nem use `main` como identificador de rollback.

## Referências

- [Release Please CLI](https://github.com/googleapis/release-please/blob/main/docs/cli.md)
- [Manifest e bootstrap](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md)
- [Schema das opções](https://github.com/googleapis/release-please/blob/main/schemas/config.json)
- [Filtros do Woodpecker](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Secrets do Woodpecker e filtros por evento](https://woodpecker-ci.org/docs/usage/secrets)
- [Adaptador GitHub: conversão de push de tag](https://github.com/woodpecker-ci/woodpecker/blob/main/server/forge/github/parse.go)
