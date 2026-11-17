# Presença+

Controle de chamadas para professores e alunos de instituições de ensino superior. Aplicativo Android e iOS com Expo SDK 58, Expo Router, TypeScript e Supabase.

O modo demonstração continua local, em `src/app/demo`, e não autentica. Login, sessão e leitura acadêmica usam o projeto Supabase configurado nas variáveis públicas.

## Configuração do Supabase

1. Crie um projeto no Supabase, ou use o projeto compartilhado da equipe.
2. Em Project Settings → API, copie o Project URL e a publishable key. A chave anon legada também pode ser colocada em `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Não use service role, `sb_secret` nem a senha do banco.
3. Na raiz do Presença+, copie o exemplo e preencha só na sua máquina:

```bash
copy .env.example .env.local
```

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env` e `.env.local` ficam fora do Git. O aplicativo recusa chave secreta. Não copie valores para o repositório.

4. No Supabase, em Authentication → URL Configuration, permita os retornos:

- `presencaplus://redefinir-senha`
- o endereço de retorno que o Expo Go mostra na tela Recuperar senha, no formato `exp://.../--/redefinir-senha`

## Aplicar migrações

As migrações não rodam sozinhas. No SQL Editor do Supabase, execute o arquivo inteiro:

`supabase/migrations/20261116120000_academic_foundation.sql`

Esse é o arquivo definitivo desta primeira migração. Ele cria perfis, disciplinas, turmas, matrículas, sessões de chamada, frequência e justificativas, com RLS. Não apaga tabelas. O papel do perfil sai apenas de `app_metadata`, definido no painel, e não pode ser escolhido pelo aplicativo.

Pelo aplicativo, a chamada nasce aberta. Nesta primeira migração, `code_expires_at` aceita no máximo 30 minutos; a migração `20261118010000_check_in_forty_minutes.sql` eleva esse teto para 40 minutos nas chamadas novas, sem alterar as já gravadas. `ends_at` é o fim da aula, de no máximo 4 horas, e pode ficar vazio enquanto a chamada está aberta. Frequência comum só entra com a chamada aberta e o código ainda válido. O professor só pode encerrar a chamada. O vínculo com a turma permanece. A marca justificada acompanha a avaliação da justificativa. Correção fora dessas regras fica no SQL Editor, sem sessão do aplicativo. As funções auxiliares ficam no esquema `private`, fora da API.

Execute este arquivo uma única vez. Não o rode de novo depois que as tabelas e as políticas existirem.

Depois que a migração inicial já estiver aplicada, execute uma única vez o arquivo novo:

`supabase/migrations/20261116180000_attendance_confirmation.sql`

Ele acrescenta a confirmação de presença pelo aluno autenticado e o encerramento que completa as faltas. Não apaga dados e não altera usuários. Essa função antiga ainda recebe o identificador da sessão e um código interno de seis dígitos; o servidor usa somente a conta autenticada, confere matrícula, chamada aberta e validade, e grava a presença. O aplicativo do professor não mostra mais esse código. A presença do aluno sem conta é a página pública descrita mais abaixo.

Depois das duas migrações anteriores, execute uma única vez:

`supabase/migrations/20261117010000_one_call_per_academic_day.sql`

Ela impede uma segunda chamada da mesma oferta de disciplina no mesmo dia em America/Sao_Paulo. Disciplinas diferentes continuam podendo ter chamada no mesmo dia. Não apaga sessões. Se o índice falhar, há duas chamadas históricas da mesma turma no mesmo dia; a consulta comentada no arquivo lista esses casos. Não apague esses registros sem decisão da equipe.

Depois das três migrações anteriores, revise e execute uma única vez:

`supabase/migrations/20261117180000_academic_groups_and_roster.sql`

Ela cria a turma acadêmica, como 5º Período, e o cadastro de alunos sem conta. A oferta de disciplina continua em `public.classes`. Ofertas já gravadas ficam sem turma acadêmica até o professor associá-las. O índice de uma chamada por oferta por dia permanece. Não apaga contas, chamadas nem presenças. Não execute este arquivo antes da revisão e não o rode de novo depois de aplicado.

Depois da migração das turmas, execute uma única vez, no SQL Editor:

`supabase/migrations/20261117220000_public_check_in.sql`

Ela acrescenta o token do QR público e a confirmação do aluno sem conta. Não apaga chamadas nem presenças. O aluno autenticado antigo continua no fluxo anterior. anon não recebe INSERT em `attendance_records`. A matrícula não prova quem está segurando o celular.

Depois dela, execute uma única vez:

`supabase/migrations/20261118010000_check_in_forty_minutes.sql`

Ela permite que uma chamada nova grave `code_expires_at` até 40 minutos depois do início. A confirmação pública continua usando esse horário gravado. Chamadas já abertas ou encerradas não são prorrogadas nem reabertas. A coluna `code` permanece por causa do gatilho e da restrição atuais; o aplicativo não mostra esse valor.

Estas migrações novas não foram executadas por este ajuste. Não rode um arquivo de novo depois de aplicado.

`supabase/tests/academic_roster.sql` cobre várias turmas, várias disciplinas, o mesmo aluno em mais de uma disciplina, matrícula repetida, isolamento entre professores e uma chamada por oferta no dia. Ele não foi executado no Supabase remoto. Não cole esse teste no projeto compartilhado: a transação cria usuários temporários e termina em `ROLLBACK`.

`supabase/tests/attendance_confirmation.sql` cobre confirmação permitida, código errado, expiração, duplicidade, aluno sem matrícula, isolamento entre turmas e encerramento. Ele não foi executado no Supabase remoto. Não cole esse teste no projeto compartilhado: a transação cria usuários temporários e termina em `ROLLBACK`. O banco descartável precisa já ter a migração inicial.

`supabase/tests/rls_permissions.sql` descreve permissões permitidas e negadas. Ele não foi executado no Supabase remoto. Não cole esse teste no projeto compartilhado: a transação cria usuários temporários e termina em `ROLLBACK`.

O script `supabase/seed/academic_demo.sql` é opcional e só cria disciplinas de demonstração depois que os perfis já existem. Ele não cria usuários nem senhas.

## Contas de teste

Crie as contas no painel Authentication → Users. Não grave senhas neste repositório.

1. Add user, com e-mail e senha definidos por quem administra o projeto.
2. Em App Metadata, informe `{"role":"professor"}` ou `{"role":"aluno"}`. O papel não pode ser escolhido pelo aplicativo.
3. Em User Metadata, se quiser, informe `full_name`, `institution`, `course` e `identifier`.
4. Se o usuário foi criado antes do papel, ajuste o App Metadata e rode no SQL Editor, trocando o identificador:

```sql
select public.provision_profile('00000000-0000-0000-0000-000000000000');
```

5. Crie ao menos um professor e um aluno. Depois, se quiser turmas de exemplo, rode `supabase/seed/academic_demo.sql`.

Sem perfil acadêmico, o login autentica no Supabase, mas o aplicativo não abre a área da conta.

## Página pública e QR Code

O professor continua abrindo uma chamada por oferta por dia, com validade de 40 minutos. O QR Code da câmera comum só aponta para uma URL HTTPS no formato `https://ENDERECO/presenca/TOKEN`. O token é aleatório e não leva matrícula nem senha. Enquanto `EXPO_PUBLIC_CHECK_IN_URL` estiver vazio, o aplicativo não desenha esse QR e avisa a configuração que falta. Não use localhost como endereço definitivo.

A página pede só a matrícula. Quem confirma é a Edge Function `confirm-presence`, que chama `confirm_public_attendance` com a chave `service_role` guardada no Supabase. Essa chave não entra no aplicativo, no Git nem neste arquivo. A função está com `verify_jwt = false` porque o aluno não tem login; a conferência do token, da matrícula, da sessão e da matrícula na oferta fica no SQL.

1. Aplique, nesta ordem e uma vez cada, `20261117220000_public_check_in.sql` e `20261118010000_check_in_forty_minutes.sql` no SQL Editor. Sem a segunda, o banco ainda recusa uma chamada nova com validade de 40 minutos.
2. Publique a função, sem colocar a chave secreta no comando:

```bash
npx supabase functions deploy confirm-presence --no-verify-jwt
```

O projeto precisa estar ligado ao Supabase CLI. `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidos pelo próprio Supabase à função. Não copie esses valores para o repositório.

3. Exporte e publique a página com Expo Hosting. O `app.json` já usa `web.output` `server`, que o Expo Hosting aceita:

```bash
npx expo export --platform web
npx eas-cli@latest deploy
```

4. Copie só a origem HTTPS que o comando mostrar, por exemplo o host sem caminho, para `EXPO_PUBLIC_CHECK_IN_URL` no `.env.local`.
5. Rode `npx expo export --platform web` e `npx eas-cli@latest deploy` de novo, para a página publicada enxergar o Supabase. Reinicie o Expo Go para o QR do professor usar o mesmo endereço.
6. Abra a chamada no aplicativo. O QR só deve aparecer depois desses passos. Escaneie com a câmera comum, não com o leitor interno do app. A página precisa responder em HTTPS antes de tratar esse teste como concluído.

A matrícula não identifica a pessoa que está com o celular. Ela apenas localiza o aluno matriculado naquela oferta.

## Executar no Expo Go

```bash
npm install
npx expo start
```

Abra o QR Code no Expo Go. O SDK do celular precisa ser o 58. Android e iOS usam o mesmo projeto.

A chamada do professor continua no aplicativo. A presença do aluno sem conta só pode ser conferida na câmera comum depois que a página HTTPS estiver publicada, conforme a seção anterior.

1. No iPhone ou no Android, entre com a conta do professor e abra a oferta real.
2. Em Área de chamada, toque em Abrir chamada. O professor vê o QR Code, o tempo restante e o horário em que ele vence. Não há código numérico na tela. A validade é de 40 minutos. Cada oferta admite uma chamada por dia.
3. Se o endereço público ainda não estiver configurado, o espaço do QR explica a configuração e não finge um código que a câmera abre.
4. Com a página publicada, aponte a câmera comum do celular para o QR. Informe a matrícula na página. A confirmação cita o nome e a disciplina.
5. O professor toca em Encerrar chamada. Quem não confirmou passa a falta. A frequência da turma usa só as chamadas encerradas.
6. O modo demonstração continua local e não grava essa confirmação.

Para checar o código:

```bash
npx tsc --noEmit
npx expo-doctor@latest
```

## Sincronizar no outro computador

1. `git pull` na branch compartilhada.
2. `npm install`.
3. Criar `.env.local` a partir de `.env.example` e preencher a URL e a chave publicável do mesmo projeto. Não copiar `.env.local` pelo Git.
4. Não rode de novo a migração inicial se ela já foi aplicada. Execute a migração de confirmação de presença só se ela ainda não estiver no Supabase.
5. `npx expo start` e abrir no Expo Go. Na primeira leitura de QR Code, o sistema pede a câmera. O microfone não é usado.

## Arquitetura

```text
src/app/            rotas do Expo Router
src/app/demo/       pré-visualização local, sem sessão
src/app/professor/  área autenticada do professor
src/app/aluno/      área autenticada do aluno
src/features/       telas por área
src/components/ui/  design system
src/domain/         tipos e regras puras, como o limite de 75%
src/data/access/    contrato síncrono da demonstração
src/data/demo/      dados locais de demonstração
src/data/remote/    cliente Supabase e leitura acadêmica
src/state/          sessão e catálogo da área atual
src/theme/          cores, espaçamento e raios
```

As telas leem o catálogo da área em que estão. A demonstração não consulta o Supabase. A conta real não lê `src/data/demo`.

Encerrar chamada e confirmar presença, no modo real, gravam no Supabase depois da migração de confirmação. Editar perfil e exportar relatório continuam sem gravação. O modo demonstração não grava.

## Identidade

Azul principal `#073B91`, destaque `#0B8FF9`, fundo `#F7F9FD`, presença `#13B981`, falta `#EF4444`. A referência visual está em `design/`.

## Colaboração

O repositório é só deste aplicativo. Não misture arquivos com outros projetos da máquina. Não há credenciais versionadas. `ios/` e `android/` não devem ser criados à mão.
