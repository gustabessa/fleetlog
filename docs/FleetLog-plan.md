# FleetLog — plano vivo

Atualizado em 2026-10-07. Status: implementação incremental iniciada; andamento em `../TODO.md`.

## Objetivo confirmado

Sistema para gestão de veículos, com recursos simplificados e interfaces modernas. Foco pessoal e familiar, podendo atender uma frota sem priorizar ferramentas empresariais.

## Decisões confirmadas

- Nome: FleetLog, em inglês e com apelo internacional.
- Frontend Angular, obrigatoriamente PWA.
- PostgreSQL.
- Interface simples, moderna, bordas ligeiramente arredondadas, temas claro e escuro alternáveis. Sem identidade pirata inicialmente.
- Sistema métrico: litros, quilômetros, km/L etc.
- Moeda inicial BRL (R$), configurável no perfil. Toda entrada de preço deve oferecer seleção de moeda, pré-selecionada conforme o perfil do usuário; inclusive preços de itens e abastecimentos. Preservar a moeda escolhida no registro histórico.
- Garagem familiar compartilhada: cada pessoa tem seu próprio login e vê os mesmos veículos. Permissões ainda em aberto.
- PWA v1 sempre online, instalável e responsiva. Uso offline e sincronização ficam no backlog de melhorias.
- Autenticação inicial com usuário e senha; suporte a provedor OpenID Connect (OIDC) configurável e substituível por configuração, sem alterar o código nem ficar preso a um fornecedor. Configurar issuer/discovery URL, client ID, client secret quando aplicável e scopes; redirect URI compatível com a URL da implantação. Definir quando entregar a integração. Troca de issuer exige tratar identidades existentes: identificar contas externas pelo par issuer + subject, sem vincular automaticamente por e-mail.
- Dockerfile e Docker Compose para implantação no Dokploy.
- Backend Go, aprovado após avaliação de viabilidade para homelab.
- Imagens em provedor compatível com S3, com RustFS como opção aprovada mediante validação de integração.
- Planejamento e implementação incrementais; manter este documento e o TODO.md atualizados. Implementação autorizada em 2026-10-07.

## Home — requisito confirmado

A tela inicial é uma listagem visual dos veículos da garagem, com imagem de cada veículo. Ao selecionar um veículo, abrir sua tela de detalhes. Direção visual do protótipo aprovada: cards responsivos com imagem, nome/modelo e informações essenciais. Badge de km em posição padronizada, no canto superior esquerdo da imagem. Não exibir BRL junto ao nome do usuário no cabeçalho.

## Tela do veículo — requisitos confirmados

- Permitir adicionar notas/informações ao veículo, incluindo número do chassi e RENAVAM.
- Oferecer ação de copiar em um clique os valores, como chassi e RENAVAM.
- Iniciar o lançamento de abastecimento dentro da tela do veículo, com o veículo definido pelo contexto, sem exigir seleção adicional no formulário.

### Proposta de apresentação — ainda não aprovada

Uma seção de informações com campos rotulados (ex.: Chassi, RENAVAM e campos personalizados), valores e botão de copiar com confirmação visual. Guardar identificadores como texto para preservar zeros iniciais. Complementar com notas de texto livre; formato e quantidade de notas ainda em aberto. “Notas” neste requisito significa informações/anotações, não implica anexos de notas fiscais.

## Compra, venda e odômetro — requisitos confirmados

- Cadastro do veículo com informações de compra e venda: data e valor, seguindo seleção de moeda em todo preço.
- Proprietário anterior e novo proprietário opcionais.
- Informar quilometragem inicial no cadastro.
- Atualizar quilometragem atual a partir das entradas de km no sistema, preservando histórico de leituras.

### Regras propostas — ainda não aprovadas

- Histórico de odômetro com data da leitura, valor em km, origem (cadastro, abastecimento, manutenção ou outro lançamento) e autor.
- Determinar o km atual pela leitura válida mais recente na cronologia do veículo, não pela ordem de digitação. Lançamento retroativo entra no histórico sem reduzir automaticamente o valor atual.
- Tratar leituras inconsistentes, correções, edição e exclusão de registros com rastreabilidade; não usar simplesmente o maior valor, pois uma leitura incorreta pode precisar ser corrigida.
- Preservar o km inicial e os dados de compra mesmo após atualizar o km atual.
- Definir se um veículo vendido será arquivado, mantendo histórico disponível.
- Definir obrigatoriedade das datas/valores de compra e venda; proprietários anterior/novo já são opcionais.

## Manutenções — requisitos confirmados

- Registrar manutenção e gasto diretamente, sem cadastrar e consumir suprimentos obrigatoriamente.
- Itens usados são opcionais.
- Dois modos de lançamento confirmados: informar apenas o total ou detalhar peças e mão de obra e deixar o sistema somar. Definir descontos e composição de moedas diferentes.
- Reutilizar a referência de um item de revisão anterior em uma nova revisão.
- Comparar preços entre revisões e pesquisar um item para consultar seu histórico de preço.

### Proposta de modelo — ainda não aprovada

Separar o cadastro reutilizável de item (nome, marca, código) de cada ocorrência na manutenção (quantidade, preço e moeda). Reaproveitar significa preencher uma nova ocorrência, preservando preços históricos. Criar ou selecionar itens dentro do formulário, sem cadastro prévio obrigatório ou controle de estoque inicial.

Proposta de campos: veículo, data, odômetro e descrição. Os dois modos de valor (total direto ou soma de peças e mão de obra) estão aprovados. Detalhes do tratamento de descontos e ajustes ainda em aberto; evitar dupla contabilização.

## Abastecimentos — requisitos confirmados

- Registrar preço, litros e odômetro em um fluxo simples de lançamento de abastecimentos.
- Métricas em km/L entre abastecimentos e histórico de consumo do veículo.

### Proposta de cálculo — ainda não aprovada

Registrar também data, combustível e indicação de tanque cheio. Permitir informar valor total e preço por litro, derivando valores quando possível.

Consumo pelo método tanque cheio a tanque cheio: distância entre registros de tanque cheio dividida pela soma dos litros abastecidos após o primeiro e até o segundo, incluindo abastecimentos parciais intermediários. Primeiro registro serve de referência. Intervalos incompletos ou com abastecimentos ausentes não fornecem medição confiável. Tratar lançamentos retroativos e correções do odômetro.

## Custos e gráficos — requisitos confirmados

- Permitir lançar custos de documentação do veículo, como impostos, licenciamento e taxas.
- Identificar os custos por tipo para gerar gráficos e análises de gastos.
- Incluir manutenção e abastecimento nas análises de custos, contando cada gasto uma única vez.

### Propostas — ainda não aprovadas

- Categorias iniciais: abastecimento, manutenção, documentação, seguro e outros. Subtipos de documentação podem incluir IPVA, licenciamento, transferência e outras taxas; definir personalização.
- Lançamento de custo com veículo, data, descrição, tipo, valor e moeda selecionável conforme regra do perfil.
- Gráficos: distribuição de gastos por tipo, evolução mensal e comparação entre veículos, com filtros por período e veículo.
- Manutenções e abastecimentos alimentam os gráficos automaticamente, sem novo lançamento manual de custo. Peças e mão de obra detalham a manutenção sem somar novamente ao total.
- Apresentar totais separados por moeda, sem somar moedas diferentes sem conversão explícita.

## Arquitetura — base aprovada; detalhes em definição

- Monólito modular Go com API HTTP/JSON; servir o build estático Angular pelo mesmo serviço.
- PostgreSQL com migrações versionadas.
- Sessões locais com cookies HttpOnly/Secure, hash de senha apropriado e proteção CSRF. Mapear identidade OIDC para usuário interno, sem vincular contas automaticamente apenas por e-mail.
- Cliente S3 configurável: endpoint, bucket, região e credenciais. RustFS substituível por outro provedor compatível.
- Compose com aplicação e PostgreSQL; RustFS opcional ou externo. Volumes persistentes, health checks, configuração por ambiente e HTTPS na implantação.
- PWA instalável e responsiva, com operações online na v1. Offline e sincronização são melhorias futuras.
- Dinheiro com precisão decimal. Guardar moeda em cada registro; alterar o perfil muda apenas o padrão de novos registros.
- Totais/comparações separados por moeda, sem conversão cambial automática inicialmente.

## Documentação de configuração — requisito confirmado

Entregar junto com a implementação um `.env.example` comentado e uma documentação curta de configuração. Nesta fase apenas registrar o requisito; não criar configurações fictícias antes de definir o contrato da aplicação.

- Documentar tudo que a aplicação efetivamente permitir configurar: finalidade, padrão, obrigatório/opcional, exemplos e quando aplicar mudanças.
- Prioridade inicial: OIDC e armazenamento S3/RustFS. Adicionar outros parâmetros conforme existirem na implementação.
- OIDC: habilitação/modo de autenticação, issuer/discovery URL, client ID, secret quando aplicável, scopes e configuração de callback/URL pública conforme contrato escolhido.
- S3: endpoint, região, bucket, credenciais, TLS via esquema do endpoint, uso de path-style quando necessário. Documentar separadamente a configuração do servidor RustFS e a configuração do cliente S3 do FleetLog.
- Exemplos com placeholders, sem credenciais reais; secrets ficam fora do repositório.
- Explicar configuração por variáveis de ambiente no Docker Compose e Dokploy e quais serviços precisam reiniciar após alterações.
- Nomes finais de variáveis, defaults e parâmetros adicionais serão definidos na implementação. Preferências de usuário, como moeda, ficam no perfil; distinguir de defaults globais.

## RustFS — avaliação inicial

A matriz oficial documenta um subconjunto testado de S3, incluindo operações básicas de objetos e casos de URLs pré-assinadas GET/PUT. Parece adequado ao armazenamento de imagens deste projeto; validar integração na versão fixada.

Proposta: bucket privado, arquivos no S3, metadados no PostgreSQL; acesso pela aplicação ou URL temporária após autorização. Usar apenas os recursos necessários, sem pilha completa de observabilidade inicialmente.

Fontes consultadas em 2026-10-07:
- https://docs.rustfs.com/en/reference/s3-compatibility
- https://docs.rustfs.com/en/installation/container
- https://go.dev/doc/database/
- https://angular.dev/ecosystem/service-workers/getting-started

## Questões em aberto

- Validar integração S3 com a versão escolhida do RustFS.
- Permissões dos membros da garagem compartilhada e forma de inclusão de familiares.
- Como compor total da manutenção, peças, mão de obra e descontos?
- Identificação dos itens, unidade e compartilhamento entre veículos; histórico por veículo ou garagem?
- Como apresentar totais de uma manutenção com preços em moedas diferentes? Seleção de moeda em toda entrada de preço já confirmada.
- Integração OIDC já na primeira versão ou posteriormente?
- Imagens/anexos iniciais: veículos, itens, manutenção, comprovantes?
- Idioma, lembretes e outras despesas; formato/escopo da importação serão definidos futuramente.
- Repositório criado; base executável em implementação.

## Backlog de melhorias

- Importação de histórico de outros sistemas: desejo futuro confirmado; fora da prioridade atual, que é construir o núcleo do produto.

- Uso offline da PWA, incluindo definição de dados disponíveis localmente.
- Lançamentos offline com sincronização posterior e tratamento de conflitos.

## Forma de trabalho

Separar decisões confirmadas, propostas e questões em aberto. Não transformar sugestões em requisitos sem concordância. Incorporar este plano ao repositório quando ele for disponibilizado.

## Histórico

- 2026-10-07: nome FleetLog e planejamento incremental iniciados.
- 2026-10-07: definidos foco familiar, manutenção simplificada com itens reutilizáveis, histórico de preços, abastecimentos/consumo, Angular/PWA, PostgreSQL, temas, medidas, moedas, autenticação e Docker/Dokploy. Go e RustFS seguem em discussão.

- 2026-10-07: confirmados garagem familiar compartilhada com logins individuais, seleção de moeda em toda entrada de preço e PWA online na v1; offline e sincronização movidos para backlog. O método de consumo ainda está em discussão.

- 2026-10-07: aprovados os dois modos de manutenção; reforçado que o provedor OIDC é configurável e substituível sem alteração de código.

- 2026-10-07: exigidos `.env.example` comentado e documentação curta das opções configuráveis, inicialmente com foco em OIDC e S3/RustFS.

- 2026-10-07: adicionadas notas/informações do veículo, incluindo chassi e RENAVAM com cópia em um clique, e lançamento de abastecimento pelo contexto da tela do veículo.

- 2026-10-07: definida home como listagem de veículos com imagens.

- 2026-10-07: confirmados custos com documentação, classificação dos custos por tipo e gráficos de gastos.

- 2026-10-07: aprovada direção visual com remoção da moeda no cabeçalho e posição fixa do badge de km; adicionados compra/venda, proprietários opcionais e odômetro inicial/atual com histórico.

- 2026-10-07: nome definitivo atualizado para FleetLog em todos os materiais do projeto.

- 2026-10-07: implementação autorizada; Go servindo Angular SPA/PWA aprovado após avaliação de viabilidade. PostgreSQL e cliente S3 com opção RustFS mantidos. Criado TODO.md para acompanhamento e retomada; detalhes de domínio pendentes continuam como propostas.
