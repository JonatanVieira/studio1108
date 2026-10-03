# Publicidade do Vialchemy na web

## O que está implementado

- Espaço lateral de 300 × 250 no computador (`game-sidebar`).
- Espaço de até 320 × 100 abaixo do jogo no celular (`game-below-mobile`).
- Rótulo “Publicidade” e distinção clara de que são espaços reservados.
- Sem sobreposição ao tabuleiro ou aos controles; o espaço móvel fica separado da barra de ferramentas por 32 px.
- Nenhum script de rede, identificador publicitário, pixel, impressão ou recompensa fictícia foi ativado.

Os espaços reservados não geram receita e não equivalem a integração com uma rede.

## O que falta para monetizar

1. Publicar o site em um endereço HTTPS controlado pelo estúdio e confirmar os dados do responsável, contato e documentos legais aplicáveis.
2. Abrir e aprovar a conta de publicidade e o site. Para anúncios de jogos/recompensados, confirmar acesso específico ao produto da rede.
3. Revisar a compatibilidade com o público infantil, já confirmado pelo proprietário. Configurar tratamento infantil antes de qualquer requisição; não basta escrever na política que o jogo aceita crianças. Não ativar anúncios personalizados nem rastreamento sem a análise e as proteções exigidas.
4. Somente então inserir os IDs aprovados e integrar o SDK/API web. AdMob nativo do aplicativo não equivale ao AdSense/web.
5. Conectar anúncios recompensados às dicas com pausa/retomada, ausência de anúncios, falhas, recusa e concessão única apenas após confirmação válida da rede. Não premiar clique em publicidade. A regra atual dos saca-rolhas não foi alterada.
6. Testar com anúncios de teste e verificar declarações de privacidade, política da rede, rotulagem e ausência de cliques acidentais antes de ativar produção.

## Referências oficiais consultadas em 01/10/2026

- H5 Games Ads exige uma conta AdSense aprovada e candidatura ao produto; aprovação não é garantida: https://support.google.com/adsense/answer/1705831
- A API de anúncios de jogos suporta intersticiais e recompensados: https://developers.google.com/ad-placement
- Tratamento de solicitações para públicos com restrição etária: https://support.google.com/adsense/answer/9007197
- Marcação de site para tratamento etário: https://support.google.com/adsense/answer/3248194

Este planejamento técnico não é uma aprovação da rede nem uma certificação de conformidade jurídica. Receita depende de tráfego, anúncios efetivamente entregues e condições comerciais da rede.
