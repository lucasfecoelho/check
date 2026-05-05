# Check

Check é um app mobile pessoal para organizar tarefas com prazo e hábitos recorrentes, com foco em simplicidade, notificações locais e uso diário no Android.

## Funcionalidades

- Tarefas com prazo
- Hábitos diários, semanais e mensais
- Tela inicial com itens do dia
- Notificações locais
- Categorias
- Configurações de aparência
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

- Criar tarefa
- Editar tarefa
- Concluir tarefa
- Criar hábito diário
- Criar hábito semanal
- Criar hábito mensal
- Testar notificação
- Alterar configurações

## Futuro

- Gerar APK com EAS Build
- Melhorar ícone e splash
- Refinar experiência visual
