# FleetLog — avaliação de produto e melhorias para revisão

2026-10-09. Esta rodada de melhorias e propostas de identidade **não será
commitada nem publicada** até revisão do usuário. O arquivamento reversível e
o botão + foram concluídos nos commits anteriores solicitados.

## Escopo entregue

O núcleo já é um produto integrado: acesso local temporário/OIDC com vinculação
explícita; garagem familiar e permissões; veículos e cor da tag; foto privada;
odômetro cronológico com auditoria; abastecimentos e consumo cheio a cheio;
manutenção direta/detalhada com referências e preços históricos; notas com
imagem opcional; compra/venda; despesas; histórico e gráficos por moeda;
URLs com recarga/Voltar; tabelas paginadas; arquivar/desarquivar.

A interface é uma PWA online. Os dados de domínio e imagens privadas não entram
no cache. Exportação, importação/offline, imagens em todos os outros registros,
lembretes e canais de notificação continuam em entregas separadas, conforme as
decisões anteriores; esta avaliação não redefine regras de negócio.

## Qualidade atual e evidências

**Persistência e autorização: base sólida para testes de uso.** Migrações
versionadas e transações; vínculo de garagem consultado por requisição; origem
em escritas; sessões e identidades externas preservadas. Valores são decimais
exatos, por moeda; correções de odômetro e lançamentos mudam atomicamente.
A integração S3 mantém reservas/fila de limpeza para tratar falhas.

**Funcionalidade: cobertura ampla do uso pessoal/familiar.** Fluxos reais
substituem mocks; a prévia continua isolada. Os formulários e leitura após
recarga, permissões/revogação, imagens e OIDC estão cobertos por testes locais.
A revisão anterior passou 62 testes Chromium desktop/mobile, além de Go com
PostgreSQL, build e vet. Arquivo/desarquivo foi validado separadamente.

**UI: evoluiu, mas o acabamento ainda precisa revisão humana.** Controles
compactos, hover compartilhado, ícones acessíveis, diálogos com rodapé fixo,
tabelas e paginação resolveram os principais desalinhamentos. Os campos
monetários mantêm precisão e máscara durante digitação. A identidade visual
usa a direção 04 escolhida pelo usuário, adaptada para SVG e cores semânticas
no header/splash. Os ícones PNG/maskable também usam o símbolo escolhido. A avaliação automatizada não substitui uso em dispositivos.

**Limites práticos.** S3/OIDC foram testados com fixtures de protocolo/provedor
assinado, não com o homelab real. HTTPS, instalação real da PWA e execução de
Playwright no CI seguem em validação/infra separada. As listas por veículo são
carregadas completas e paginadas na UI; o histórico geral já pagina na API.
Isso atende a garagem pessoal de teste, mas grandes históricos merecem uma
entrega de paginação por veículo antes de tratar volume como requisito.

## Melhorias propostas e implementadas nesta rodada

### 1. Carregamento visível e acessível

- Componente FlLoading com spinner, trilha animada e área reservada para reduzir saltos.
- Entrada/saída gradual dos loadings e transições curtas entre abas, preservando filtros entre Histórico/Custos.
- Spinner em botões que já têm estado loading; rótulo e aria-busy preservados.
- Sem bloquear leituras antigas com tela vazia desnecessária.
- Movimento desligado quando prefers-reduced-motion estiver ativo.

### 2. Abertura da aplicação e PWA

- Splash HTML/CSS antes de Angular carregar e componente equivalente durante
  a resolução de acesso, com FleetLog, animação discreta e mensagem curta.
- Fundo e cores seguem tokens de tema; preferência visual é aplicada antes da
  primeira renderização por script externo, sem cache de dados privados.
- Assets de abertura entram apenas no cache do shell.
- Modo standalone usa área disponível e safe-area, evitando texto perdido.
- Logo 04 no header e splash, com cor de destaque da paleta e tinta do tema.

A tela inicial nativa exibida pelo navegador/SO antes de carregar o HTML usa
manifest/ícones; sua aparência e timing não são controlados pelo Angular.
Ícones PNG/maskable foram gerados a partir do símbolo vetorial escolhido.
A validação de instalação em Android/iOS continua pendente; o navegador/SO
define a aparência da splash nativa, enquanto a splash HTML acompanha o tema.

### 3. Feedback das ações

- Confirmações continuam no diálogo do sistema.
- Alterações de registros mostram confirmação discreta de sucesso no veículo,
  com anúncio acessível; falhas conservam formulário e possibilidade de repetir.
- Arquivar/desarquivar mostra o estado atualizado e conserva os dados.

### 4. Segurança de revisão e identidade

- 20 conceitos originais gerados para revisão; a galeria permanece local e fora do bundle.
- Direção 04 escolhida pelo usuário e adaptada para vetor; imagem de referência
  preservada junto à documentação. Símbolo separado nos ícones PWA para legibilidade.

## Critérios de revisão do usuário

1. Abrir a aplicação e repetir login/logout com temas diferentes.
2. Criar e editar lançamento, conferir máscara/cálculo e erro recuperável.
3. Testar ações rápidas e detalhes por URL, recarga e Voltar/Avançar.
4. Usar as tabelas com mais de cinco registros e teclado no paginador.
5. Conferir diálogos em desktop/mobile e com redução de movimento.
6. Conferir logo em todas as paletas e os novos ícones ao reinstalar a PWA.

## Fora da implementação desta rodada

As limitações de infra e volume acima são requisitos para uma entrega futura,
não promessas de validação feita. Não criar novos workflows de família,
notificações, recuperação, importação/offline ou exportação sem definir seu
escopo com o usuário. Após revisão, o usuário autorizou commit e push das
melhorias de loading/transição e identidade escolhida.

## Validação da entrega com identidade 04

Build de produção concluído. A suíte geral passou 64 verificações desktop/mobile;
o teste de transição usava o nome anterior da animação e foi corrigido para
verificar Histórico e Custos separadamente. As quatro verificações de animação,
cor da logo e redução de movimento passaram na repetição (66 cenários únicos
validados no conjunto). Nenhuma validação de deploy/homelab foi executada.
