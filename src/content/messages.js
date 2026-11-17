/**
 * Textos de funcionalidades ainda não conectadas.
 * Nenhuma destas mensagens deve ser substituída por um sucesso falso.
 */
export const connectionMessages = {
  rejectedKey: 'A chave configurada não pode ser usada no aplicativo. Use a chave publicável.',
  unconfigured: 'A conexão com o servidor ainda não está configurada neste aparelho.',
  offline: 'Não foi possível conectar ao servidor. Verifique a internet e tente de novo.',
  authFailed: 'Não foi possível entrar. Tente novamente.',
  recoveryFailed: 'Não foi possível enviar a recuperação de senha.',
  recoveryAccepted: 'O pedido foi aceito. Se o e-mail estiver cadastrado, as instruções chegam em seguida. Abra o link neste aparelho.',
  needsProfile: 'Sua conta ainda não tem perfil acadêmico. Peça à instituição para concluir o cadastro.',
  studentAppBlocked: 'Esta conta é de aluno. O aplicativo é exclusivo do professor. A presença do aluno será confirmada na página da chamada, sem login.',
  profileLoad: 'Não foi possível carregar o perfil desta conta.',
  passwordChanged: 'Senha atualizada.'
};
export const pendingMessages = {
  auth: 'A autenticação será conectada em uma etapa posterior. Nenhum acesso foi realizado.',
  recovery: 'O envio de e-mail será conectado posteriormente. Nenhuma mensagem foi enviada.',
  closeCall: 'O encerramento da chamada será conectado posteriormente. Nenhuma chamada foi encerrada.',
  profile: 'A edição do perfil será conectada posteriormente.',
  exportReports: 'A exportação de relatórios será conectada posteriormente.',
  qr: 'O QR Code será gerado quando a chamada real estiver conectada.',
  publicOrigin: 'Defina EXPO_PUBLIC_CHECK_IN_URL com o endereço HTTPS publicado da página. Até lá, a câmera do celular não abre este QR Code.',
  publicToken: 'Esta chamada ainda não tem o token público. Aplique a migração nova no Supabase e abra a chamada outra vez.',
  publicExpired: 'O QR Code venceu. A câmera não confirma presença nesta chamada.',
  visualOnly: 'Toques na lista alteram apenas esta pré-visualização e não são salvos.',
  rosterLater: 'A lista nominal desta turma será carregada quando os dados reais estiverem conectados.',
  noOpenCall: 'Não há chamada aberta para esta turma na pré-visualização.',
  noOpenSubject: 'Não há chamada aberta para esta disciplina na pré-visualização.'
};
