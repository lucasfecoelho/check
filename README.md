# Check

Check é um app mobile pessoal para organizar rotina, tarefas e hábitos com dados locais, notificações no aparelho e foco em uso diário no Android.

Versão atual: 1.3.0  
Descrição da versão: Rotina diária, streaks, calendário, estatísticas, hábitos quantitativos, água e sono.

## Funcionalidades

- Tarefas com prazo
- Hábitos diários, semanais e mensais
- Progresso diário
- Streaks de hábitos
- Hábitos quantitativos
- Lembrete de água
- Registro de sono
- Calendário mensal
- Estatísticas
- Categorias
- Notificações locais
- Tema claro/escuro
- SQLite local
- Sem login e sem nuvem

## Stack

- Expo
- React Native
- TypeScript
- Expo Router
- SQLite
- Expo Notifications
- StyleSheet
- Lucide React Native
- date-fns

## Como Rodar

Instale as dependências:

```bash
npm install
```

Inicie o app:

```bash
npx expo start
```

Se houver dificuldade de conexão com o celular na rede local, use tunnel:

```bash
npx expo start --tunnel
```

## Observações

- O app foi pensado inicialmente para Android.
- O app usa notificações locais, não push notifications remotas.
- O app salva os dados localmente no celular.
- Não há backend, login, Firebase, Supabase ou nuvem.

## Checklist de Testes

- Criar, editar e concluir tarefa
- Criar hábito diário, semanal e mensal
- Registrar progresso em hábito quantitativo
- Validar lembrete de água
- Registrar sono
- Conferir calendário e estatísticas
- Testar notificações locais
- Alternar tema claro/escuro
- Alterar configurações

Para validar o Caderno antes de um release, use também `docs/qa-caderno-release.md`.

## Futuro

- Gerar APK com EAS Build
- Melhorar ícone e splash
- Refinar experiência visual
