# Lembretes de manutenção — proposta e TODO

Entrega separada solicitada em 2026-10-08. Nenhum agendador, provedor de
notificações ou serviço do homelab foi configurado nesta rodada.

## Painel proposto por veículo

- Serviço: óleo/filtro, revisão, pneus, inspeção ou descrição livre.
- Última realização: data e odômetro; oferecer preenchimento pela manutenção real.
- Recorrência: intervalo em quilômetros, meses ou ambos, conforme manual e escolha do usuário.
- Antecedência: quilômetros/dias antes do vencimento.
- Próxima meta: km/data calculados; estado próximo/vencido/concluído.
- Ao concluir, vincular manutenção real e sugerir a próxima recorrência.

Os valores dos intervalos vêm do manual/configuração do usuário. Antes de
implementar, aprovar a combinação km/data, adiamento, conclusão sem manutenção,
tratamento de correções de odômetro e quais membros podem configurar regras.

## TODO da entrega

- [ ] Aprovar regras do painel e recorrência; dados insuficientes não criam falsas metas.
- [ ] Persistir regras por veículo e permissões; integrar com manutenção e odômetro.
- [ ] Exibir lembretes na garagem e detalhes, com confirmação de conclusão/adiamento.
- [ ] Definir destinatários, fuso/horários, consentimento e antecedência padrão.
- [ ] Implementar fila persistida, tentativas, deduplicação e cancelamento após correção.
- [ ] Avaliar Web Push direto com VAPID, sem exigir assinatura de plataforma comercial: HTTPS, service worker, consentimento e subscriptions por dispositivo. A [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API) permite entrega pelo serviço de push do navegador; validar navegadores/dispositivos e funcionamento da PWA instalada.
- [ ] Separar o lembrete do canal: adaptadores futuros para e-mail/webhook/ferramenta self-hosted podem usar a mesma fila. Escolher/configurar serviços do homelab em tarefa própria.
- [ ] Proteger endpoints de subscription e não expor conteúdo da garagem sem consentimento.
- [ ] Testar mudanças de km/data, lançamentos retroativos, recorrência, múltiplos membros/dispositivos e repetição de entrega.
