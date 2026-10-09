# Valores e moedas — contrato para os lançamentos

A preferência do perfil começa em BRL e preenche a moeda de novos formulários.
Moedas disponíveis nesta entrega: BRL, USD, EUR, GBP, ARS, CAD, JPY e CHF.
Cada lançamento deve salvar sua própria moeda. Alterar o perfil nunca modifica
registros existentes; totais de moedas diferentes devem ficar separados.

As futuras APIs financeiras receberão valores como strings decimais canônicas
(ponto decimal, sem separadores de milhar ou notação exponencial), por exemplo
`{"amount":"123.45","currency":"BRL"}`. O banco usará `numeric(18,6)`;
preços unitários podem ter até seis casas. Valores não passam por `float64`.
A entrada deve rejeitar excesso de precisão, valores negativos e estouro.
As regras de arredondamento de totais serão definidas nas entregas que calculam
abastecimentos e itens de manutenção. Não há conversão cambial automática.

A prévia mantém seus valores fictícios em centavos de BRL; esse formato não é
um contrato das APIs financeiras reais.

## Preferências

`GET /api/auth/me` e login retornam `currency`, `palette` e `theme` junto ao usuário.
`PUT /api/profile` atualiza somente o usuário da sessão, com campos opcionais
`currency`, `palette`, `theme` (ao menos um obrigatório). Requer Origin e JSON.
Modo: `light` ou `dark`; paletas: catálogo da interface. Campos desconhecidos e
valores inválidos retornam 400. Respostas autenticadas usam `no-store`.

Após login, o perfil salvo prevalece sobre o cache de tema do navegador.
Sem sessão, a seleção permanece local. Erros de gravação são mostrados com
opção de tentar novamente; a seleção visual é aplicada imediatamente.
