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
  recoveryAccepted:
    'O pedido foi aceito. Se o e-mail estiver cadastrado, as instruções chegam em seguida. Abra o link neste aparelho.',
  needsProfile: 'Sua conta ainda não tem perfil acadêmico. Peça à instituição para concluir o cadastro.',
  profileLoad: 'Não foi possível carregar o perfil desta conta.',
  passwordChanged: 'Senha atualizada.',
} as const;

export const pendingMessages = {
  auth: 'A autenticação será conectada em uma etapa posterior. Nenhum acesso foi realizado.',
  recovery: 'O envio de e-mail será conectado posteriormente. Nenhuma mensagem foi enviada.',
  closeCall: 'O encerramento da chamada será conectado posteriormente. Nenhuma chamada foi encerrada.',
  profile: 'A edição do perfil será conectada posteriormente.',
  exportReports: 'A exportação de relatórios será conectada posteriormente.',
  qr: 'O QR Code será gerado quando a chamada real estiver conectada.',
  visualOnly: 'Toques na lista alteram apenas esta pré-visualização e não são salvos.',
  rosterLater: 'A lista nominal desta turma será carregada quando os dados reais estiverem conectados.',
  noOpenCall: 'Não há chamada aberta para esta turma na pré-visualização.',
  noOpenSubject: 'Não há chamada aberta para esta disciplina na pré-visualização.',
} as const;
