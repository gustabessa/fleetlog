# Lembretes de manutenção por veículo

Painel e avisos internos implementados após aprovação em 2026-10-09.
Não há agendador nem integração de notificações externas nesta entrega.

## Funcionamento

- Cada veículo tem lembretes com serviço, última realização (km/data), intervalo
  em quilômetros, meses ou ambos e antecedência em km/dias.
- Os intervalos são escolhidos pelo usuário conforme o manual. Nenhum intervalo
  de fabricante é presumido pelo sistema. A referência inicial é obrigatória
  para cada limite configurado.
- Vence pelo primeiro limite atingido. Próxima meta, distância/dias restantes e
  estados Em dia, Próxima, Vencida e Dados incompletos aparecem na tabela.
- Meses seguem calendário civil, ajustando ao último dia quando necessário.
- Registrar manutenção abre o formulário existente com veículo/descrição
  preenchidos. O km é obrigatório quando o lembrete usa intervalo em km.
- A manutenção e seu vínculo são gravados numa única transação. Falhas não
  deixam um lançamento salvo sem renovar o lembrete.
- Vincular existente permite selecionar uma manutenção do mesmo veículo;
  repetições do mesmo vínculo não duplicam a conclusão.
- A manutenção vinculada mais recente por data/km/id define a referência. Uma
  manutenção retroativa não substitui uma mais recente. Editar data/km recalcula
  as metas; excluir faz retornar à referência anterior ou à inicial. Se retirar
  um km necessário, o estado passa a Dados incompletos, sem inventar uma meta.
- A garagem destaca próximos, vencidos e registros com dados incompletos, com
  atalho para o veículo. Veículos arquivados conservam regras/histórico, mas
  ficam fora dos avisos da garagem.
- Qualquer membro pode configurar/vincular; permissões e autoria seguem a
  garagem. Inclusão, edição, exclusão e conclusão são auditadas.
- Datas de avaliação vêm do dia civil informado pelo app; consultas sem asOf
  usam o dia UTC do servidor. Não há horário de entrega de notificações aqui.
- A tabela começa com cinco itens e permite aumentar a paginação. O módulo de
  lembretes é carregado sob demanda, separado do bundle principal.

## Validação local

Testes PostgreSQL isolados cobrem primeiro limite, antecedência, fim de mês e
ano bissexto, referência de manutenção, atomicidade, idempotência, correções,
exclusão, km ausente, isolamento entre veículos, acesso anônimo e arquivamento.
Testes Chromium desktop/mobile cobrem cadastro, atalho com descrição preenchida,
manutenção, persistência após F5, avisos na garagem e vínculo existente por data.

## Próximas entregas — decisões pendentes

- [ ] Definir adiamento, pausa e histórico visual de ciclos concluídos.
- [ ] Definir destinatários, fuso/horários, consentimento e canais de notificação.
- [ ] Fila persistida, tentativas, deduplicação e cancelamento após correções.
- [ ] Avaliar Web Push com VAPID; requer HTTPS, consentimento e subscriptions.
- [ ] Adaptadores para e-mail/webhook/ferramentas self-hosted, sem acoplar canal
  à regra de lembrete. Serviços do homelab ficam em tarefa própria.
- [ ] Proteger endpoints de subscriptions e definir conteúdo permitido.
- [ ] Testar múltiplos membros/dispositivos e repetição de entrega.

Resultado: suíte Go/PostgreSQL completa e `go vet ./...` aprovados; 12 cenários
únicos Chromium desktop/mobile validados (10 da regressão e dois adicionais
para vínculo existente). Build aprovado com aviso de tamanho: bundle inicial
514,57 kB para orçamento de aviso de 500 kB; o limite não foi aumentado.
