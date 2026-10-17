# Referência da API · OpenAPI e Scalar

[Documentação](README.md) · [Self-hosting](self-hosting.md) · [Contrato OpenAPI](openapi.json)

O contrato em `docs/openapi.json` usa OpenAPI 3.1 e descreve as 63 operações atuais: sessão e OIDC, perfil, garagens e membros, veículos, odômetro/auditoria, abastecimentos, manutenção, despesas, histórico, itens, notas, compra/venda, lembretes e imagens. A rota do callback OIDC documentada é a padrão; instâncias podem substituí-la por `OIDC_CALLBACK_PATH`.

## Abrir a interface

Depois de compilar ou implantar a versão que inclui a referência, abra **`/docs/api`**, por exemplo `https://fleetlog.qbsoft.dev/docs/api`. O servidor redireciona para `/docs/api/` e serve uma página estática independente. O arquivo servido em `/docs/api/openapi.json` recebe a versão de `VERSION` durante o build.

O Scalar 1.75.0 é copiado da dependência npm com versão fixa, sem CDN e sem entrar no bundle Angular. Fontes remotas, telemetria, proxy externo e agente de IA estão desativados. O console limita suas requisições à mesma origem. A referência não entra no cache de navegação da PWA nem no seu download inicial; precisa de conexão para executar chamadas.

## Autenticação e testes

A API usa **cookie de sessão HttpOnly `fleetlog_session`**, e não bearer token. Entre no FleetLog normalmente, nesta mesma origem, e abra a documentação em outra aba. O navegador envia o cookie sem expor seu valor ao JavaScript. O console não persiste credenciais de autenticação.

Também é possível usar `POST /api/auth/login` no console com o login local habilitado; o servidor emite o cookie. Para OIDC, use o fluxo de entrada do aplicativo, pois ele envolve navegação e retorno do provedor. Uma sessão OIDC concluída também é uma sessão do FleetLog.

O **Test Request** do Scalar envia chamadas reais à instância aberta. Criar, editar e excluir afeta os dados dessa instância; para explorar operações de escrita, use uma garagem e uma instância de testes.

No navegador, o header `Origin` é definido pelo próprio navegador. A API exige origem igual a `PUBLIC_URL` nas escritas, `Content-Type: application/json`, inclusive em DELETE (envie `{}`). Uploads são bytes puros com Content-Type `image/jpeg`, `image/png` ou `image/webp`, sem multipart. Não há CORS para aplicações de terceiros. Fora do navegador, envie `Origin` explicitamente e mantenha o cookie em um cookie jar.

Exemplo local com dados de uma instalação de testes:

```sh
curl -c cookies.txt http://localhost:8080/api/auth/login \
  -H 'Origin: http://localhost:8080' \
  -H 'Content-Type: application/json' \
  --data '{"username":"seu-usuario","password":"sua-senha"}'

curl -b cookies.txt http://localhost:8080/api/garages
```

O cookie jar contém uma sessão; mantenha-o privado e remova-o depois do uso. Para origem HTTPS, use a URL HTTPS real e o `Origin` correspondente.

## Convenções do contrato

- Valores monetários e quilômetros são **decimais em texto**; `initialKm` no cadastro do veículo é uma exceção e usa número JSON.
- Datas civis usam `YYYY-MM-DD`; timestamps de autoria/auditoria usam data e hora.
- Recursos fora da garagem acessível retornam 404. A gestão de membros exige o criador; membros autorizados podem alterar os dados da garagem.
- Fotos são privadas, precisam de S3 configurado e não entram no cache da PWA.
- Venda e exclusão de veículo arquivam; não removem o histórico.
- O histórico é paginado, mas seus agregados incluem todos os registros do filtro e separam moedas.
- `Error` descreve erros JSON comuns. Os códigos documentados incluem validação, autenticação, autorização, conflito e dependências indisponíveis; nem toda dependência opcional estará habilitada em toda instância.

## Manutenção

Ao adicionar ou alterar uma rota, confira método, parâmetros, corpo, respostas, limites, autenticação e exemplos no contrato. Confira também este guia e o README, conforme `AGENTS.md`. O Release Please atualiza `info.version` no PR de release; o build mantém a cópia servida sincronizada com `VERSION`.

O teste Go `TestOpenAPIRoutes` confere que cada operação documentada resolve para uma rota real registrada. Testes de navegador conferem que a interface carrega sem buscar assets externos, expõe o contrato e pode ler uma rota autenticada usando a sessão real. Esses checks complementam, mas não substituem, a revisão dos formatos de entrada/saída e os testes funcionais da API.

Valide o contrato a partir da raiz com `npm exec --yes --package=@redocly/cli@2.64.1 -- redocly lint docs/openapi.json --config redocly.yaml`. A configuração mantém as regras recomendadas de estrutura, referências e operação, dispensando a exigência artificial de 4xx em rotas públicas e 2xx no callback que redireciona com 303.

Para executar os testes existentes, veja [desenvolvimento](technical-reference.md#desenvolvimento). O contrato é JSON padrão: pode ser importado por outros clientes e validadores OpenAPI, independentemente do Scalar.
