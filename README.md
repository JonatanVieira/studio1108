# STUDIO 1108 GAMES · Vialchemy web

Pacote independente, preparado em 3 de outubro de 2026. Contém o site e o jogo web real, com as artes, a fonte, o ícone da poção e a instalação pela tela inicial. Não contém o projeto Unity de desenvolvimento.

## Publicar os testes pelo GitHub

1. Crie um repositório novo no seu GitHub, com a branch principal chamada **main**.
2. Envie **o conteúdo desta pasta** para a raiz do repositório: `dist`, `scripts`, `.github` e os demais arquivos. Não envie a pasta inteira como uma subpasta. Prefira GitHub Desktop. Pelo navegador, confirme especialmente o envio de `.github/workflows/publicar.yml`.
3. No repositório, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
4. Abra **Actions → Publicar site de testes no GitHub Pages → Run workflow**. Depois do primeiro envio, novos envios para main acionam a atualização automaticamente.
5. Aguarde o resultado verde. O endereço aparecerá em **Settings → Pages** e no resultado da publicação. Só esse resultado confirma que o site foi publicado.

O fluxo descobre o nome do repositório e ajusta os caminhos de imagens, páginas, fontes, jogo e instalação. Não é preciso colocar seu usuário ou token em arquivos. Ative o HTTPS no endereço final. Um domínio próprio deve ser configurado no Pages e no seu provedor de DNS; ele não está comprado nem configurado neste pacote.

**Atenção à visibilidade:** na modalidade gratuita, o Pages usa repositório público. Nesse caso, os arquivos publicados e as artes podem ser vistos/baixados por outras pessoas. Escolha a visibilidade conscientemente; não coloque dados pessoais, senhas ou chaves no repositório. Publicar arquivos não concede automaticamente uma licença de reutilização.

## Antes de usar como lançamento comercial

As pastas `.pages-build-test` e `.pages-build-root` são apenas cópias geradas para os testes locais. Sua remoção automática foi bloqueada pelo ambiente. Elas já estão excluídas pelo `.gitignore`: não as envie manualmente pelo navegador. O fluxo de publicação usa somente `dist/` para gerar o site.

O GitHub é adequado para guardar o projeto. O GitHub Pages não deve ser tratado como hospedagem definitiva de um jogo monetizado sem verificar a adequação às suas regras: há restrições de hospedagem de negócios/comércio e limite flexível de tráfego de 100 GB/mês. Este jogo baixa cerca de 89 MB no primeiro carregamento, antes das imagens do site. O pacote também pode alimentar outra hospedagem estática que aceite jogos e monetização.

- [Regras e limites do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Publicação com GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Anúncios reais ainda não estão conectados. O público inclui crianças: a hospedagem de produção, os textos legais e a rede de anúncios precisam ser compatíveis. As configurações aqui não representam aprovação jurídica, publicitária ou de loja.

## Instalar no celular

- Android compatível: o botão abre a confirmação nativa **quando o navegador disponibilizar**. Não há instalação silenciosa.
- iPhone: a adição usa o menu Compartilhar do Safari; o site apresenta instruções visuais resumidas.
- O ícone é a poção. A abertura ocorre em `/jogar/`, sob o endereço do site.
- O primeiro carregamento precisa de internet. Não há garantia de uso offline.
- O progresso é local ao navegador, sem conta e sem sincronização com o app Android. Mudar de domínio ou limpar dados pode fazer o progresso anterior deixar de aparecer.
- Validar instalação em Android e iPhone reais no endereço final.

## Arquivos

- `dist/`: site completo e exportação web do Unity.
- `scripts/build-pages.mjs`: gera uma cópia para publicação com o caminho correto, sem alterar os arquivos originais.
- `.github/workflows/publicar.yml`: publicação automática no Pages após ativá-lo.
- `check-site.mjs`: verifica referências, ícones e arquivos do jogo.
- `serve.mjs`: prévia local.
- `MONETIZACAO.md`: estado da integração de anúncios.
- `VALIDACAO.md`: verificações realizadas e pendentes.

## Prévia local (opcional)

Com Node.js instalado, abra um terminal nesta pasta:
```text
node check-site.mjs
node serve.mjs
```
Abra o endereço local informado. Não abra o HTML com duplo clique, pois o jogo precisa de HTTP/HTTPS.

Para outra hospedagem na raiz de um domínio, publique `dist/`. Para um endereço com subpasta, gere:
```text
node scripts/build-pages.mjs --base /nome-do-repositorio
```
O resultado fica em `.pages-build/`. A ferramenta recusa sobrescrever uma saída já existente. Não publique o README nem toda a raiz do repositório como se fosse a pasta do site.

As alterações futuras na pasta principal não se copiam automaticamente para este pacote. Atualize `dist/` e confira os arquivos antes de enviar uma nova versão.
