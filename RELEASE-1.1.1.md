# Vialchemy 1.1.1 — carregamento web

Atualização de 19 de outubro de 2026.

- Pacote do jogo: 88.867.550 → 67.710.161 bytes, redução de 23,81%.
- Artes antigas fora de uso retiradas do build; arquivos originais preservados no projeto Unity. Resolução das artes atuais mantida.
- Até três partes baixadas simultaneamente, com verificação SHA-256.
- Cache de binários separada do progresso. Arquivos íntegros são reaproveitados em reaberturas; falhas de armazenamento usam o download normal.
- Mesmos caminhos e identidade do jogo. Não é preciso limpar os dados do navegador ou reinstalar o atalho.
- Regras, inventário, anúncios e compras sem mudanças nesta atualização.

## Validação

Build Web Unity concluído sem erros ou avisos. Passaram 25 testes do carregador, 16 da integração de anúncios e 14 de instalação/abertura simulada. Arquivos e hashes conferidos. Testes de lógica das fases passaram; menu, partida, despejo e preservação de uma estrela da 1.1.0 foram conferidos no Chromium desktop.

Ainda é necessário avaliar rede móvel, FPS e memória em aparelhos Android/iPhone reais. Os tempos de abertura no servidor local não representam a velocidade em celulares. O armazenamento do navegador pode ser removido pelo sistema; não há garantia de jogo integralmente offline.

## Pacote

`dist/game/builds/Vialchemy-1-1-1-Web-20261016-163728-chunks4m`: 20 arquivos, partes de até 4 MiB. A versão anterior foi preservada para permitir retorno.

Esta publicação atualiza a versão web. Não substitui aplicativos Android/iOS instalados e não ativa anúncios reais.
