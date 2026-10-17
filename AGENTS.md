# Regras permanentes do FleetLog

- Toda alteração deve ser feita em uma branch e entrar na main por PR.
- Nunca fazer commits ou pushes diretamente na main.
- Usar Conventional Commits nos títulos dos PRs e nas mensagens de squash merge.
- Publicar versões somente após o merge do PR de release criado pelo Release Please.
- Merges comuns podem atualizar a proposta de release, mas não devem publicar versão nem executar o Woodpecker completo.
- Tags v* ficam reservadas ao Release Please.
- Manter essas regras em futuras alterações de CI.
