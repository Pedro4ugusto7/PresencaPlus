# Presença+

Controle de chamadas para professores e alunos de instituições de ensino superior. Aplicativo Android e iOS com Expo SDK 58, Expo Router e TypeScript.

A interface deste pacote é navegável no Expo Go. Login, recuperação de senha, chamada e relatórios ainda não gravam dados: a autenticação e o backend entram no próximo pacote.

## Executar

```bash
npm install
npx expo start
```

Abra o projeto no Expo Go (Android ou iOS) pelo QR Code. O SDK do celular precisa ser o 58.

Para checar o projeto:

```bash
npx tsc --noEmit
npx expo-doctor@latest
```

## Arquitetura

```text
src/app/            rotas do Expo Router
src/features/       telas por área (boas-vindas, acesso, professor, aluno)
src/components/ui/  design system
src/domain/         tipos e regras puras, como o limite de 75%
src/data/access/    contrato de leitura
src/data/demo/      dados locais de demonstração
src/state/          modo demonstração
src/theme/          cores, espaçamento e raios
```

As rotas em `src/app/` apenas ligam o endereço à tela. Cálculo de frequência fica em `src/domain`. Listas de exemplo ficam em `src/data/demo` e passam pelo contrato `AttendanceSource`.

## Modo demonstração

Na tela de entrar, os botões **Pré-visualizar como professor** e **Pré-visualizar como aluno** abrem `src/app/demo/`. Um aviso fixo deixa claro que não há autenticação. O botão **Entrar** valida o formulário e informa que o acesso ainda não está conectado.

Para remover a pré-visualização quando a autenticação real existir:

1. Apague `src/app/demo/`, `src/state/demo-mode.tsx` e `src/data/demo/`.
2. Implemente `AttendanceSource` com a fonte real e troque `previewSource` em `src/data/index.ts`.
3. Retire os botões de pré-visualização de `src/features/auth/login-screen.tsx`.

## Identidade

Azul principal `#073B91`, destaque `#0B8FF9`, fundo `#F7F9FD`, presença `#13B981`, falta `#EF4444`. A referência visual está em `design/`.

## Colaboração

O repositório é só deste aplicativo. Não misture arquivos com outros projetos da máquina. Não há credenciais neste pacote. `ios/` e `android/` não devem ser criados à mão.

## Fora deste pacote

- Supabase e autenticação real
- Persistência de chamada, perfil e relatórios
- QR Code gerado de fato
- Exportação de relatórios
