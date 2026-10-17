# Regras permanentes do FleetLog

- Toda alteração deve ser feita em uma branch e entrar na main por PR.
- Nunca fazer commits ou pushes diretamente na main.
- Usar Conventional Commits nos títulos dos PRs e nas mensagens de squash merge.
- Publicar versões somente após o merge do PR de release criado pelo Release Please.
- Merges comuns podem atualizar a proposta de release, mas não devem publicar versão nem executar o Woodpecker completo.
- Tags v* ficam reservadas ao Release Please.
- Manter essas regras em futuras alterações de CI.
- Executar o Release Please no pipeline leve `.woodpecker/release.yaml`, somente em pushes na main; manter o pipeline completo `.woodpecker/build.yaml` restrito às tags v*.
- Não executar simultaneamente Release Please no GitHub Actions e no Woodpecker. Usar secret dedicado `release_please_token`, disponível apenas em pushes confiáveis, sem reutilizar credenciais GHCR.
- Em toda alteração, sempre conferir se é necessário atualizar o README e/ou a documentação técnica. Atualizar os documentos afetados antes de concluir a entrega; quando não houver impacto documental, registrar essa conclusão na descrição do PR.
