# Checklist de QA para release — Caderno

Use este roteiro antes de gerar uma build pública do Check. A ideia é validar o módulo novo sem perder a confiança nas áreas antigas do app.

## Preparação

- [ ] Testar em instalação nova.
- [ ] Testar em uma instalação com dados antigos já cadastrados.
- [ ] Se houver build anterior com schema legado do Caderno, manter uma cópia dela para validar a migração.
- [ ] Confirmar que o aparelho/emulador está sem erros no console ao abrir o app.

## Smoke test geral

- [ ] O app abre normalmente.
- [ ] A aba **Início** carrega.
- [ ] A aba **Tarefas** carrega e ainda permite criar/editar/concluir tarefa.
- [ ] A aba **Hábitos** carrega e ainda permite criar/concluir hábito.
- [ ] A aba **Caderno** aparece e carrega.
- [ ] A aba **Perfil** carrega e mantém as configurações.

## Banco e migração

- [ ] Em instalação nova, o app cria as tabelas do Caderno sem erro.
- [ ] Em instalação existente, tarefas, hábitos e configurações antigas permanecem intactos.
- [ ] Em banco legado do Caderno, anotações antigas continuam visíveis após atualizar.
- [ ] Anotações legadas arquivadas continuam arquivadas após migrar.
- [ ] É possível criar uma anotação rápida após migrar um banco legado.
- [ ] Ao excluir uma anotação, seus itens relacionados somem junto.

## Caderno — criação e edição

- [ ] Criar **Nota** apenas com título.
- [ ] Criar **Nota** com título e conteúdo.
- [ ] Editar título e conteúdo de uma nota.
- [ ] Excluir uma nota.
- [ ] Arquivar uma nota e confirmar que ela sai de **Todos** e aparece em **Arquivados**.
- [ ] Criar **Lista** com múltiplos itens.
- [ ] Marcar e desmarcar item de lista.
- [ ] Editar e remover item de lista.
- [ ] Criar **Tarefa** do Caderno com múltiplas subtarefas.
- [ ] Marcar e desmarcar subtarefa.
- [ ] Editar e remover subtarefa.
- [ ] Fechar e reabrir o app; confirmar persistência dos dados e estados concluídos.

## Captura rápida

- [ ] Salvar texto curto; ele vira o título da nota.
- [ ] Salvar texto longo; o título é resumido e o texto completo permanece no conteúdo.
- [ ] Após salvar, o campo limpa.
- [ ] O feedback de sucesso aparece.
- [ ] A nota criada aparece no topo da lista.

## Filtros e busca

- [ ] **Todos** mostra apenas itens não arquivados.
- [ ] **Notas**, **Listas** e **Tarefas** mostram somente seus tipos ativos.
- [ ] **Arquivados** mostra somente anotações arquivadas.
- [ ] Buscar por título encontra a anotação correta.
- [ ] Buscar por conteúdo encontra a anotação correta.
- [ ] Buscar por item/subtarefa encontra a anotação correta.
- [ ] Busca e filtros funcionam juntos.
- [ ] Busca ignora maiúsculas/minúsculas.
- [ ] Sem resultados, aparece **Nenhum resultado encontrado**.

## Integração com Tarefas

- [ ] No detalhe da anotação, tocar em **Transformar em tarefa** abre o fluxo de nova tarefa.
- [ ] O título da tarefa vem pré-preenchido.
- [ ] O usuário ainda precisa escolher categoria, data e horário.
- [ ] Salvar cria a tarefa sem apagar a anotação original.
- [ ] Com a opção de arquivar ligada, a anotação é arquivada somente depois que a tarefa é salva.
- [ ] Hábitos continuam inalterados.

## Visual e Android

- [ ] Tipografia, cores, cards e espaçamentos seguem o restante do app.
- [ ] O teclado não cobre campos importantes nos formulários.
- [ ] A rolagem funciona em notas com muitos itens.
- [ ] Toques em adicionar, concluir, excluir e arquivar respondem normalmente.
- [ ] O botão voltar do Android retorna para a tela esperada.
- [ ] Não há travamentos perceptíveis ao buscar ou alternar filtros.

## Verificações antes de subir release

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] Gerar bundle/build Android com sucesso.
- [ ] Revisar logs do app sem erros novos do banco ou navegação.
