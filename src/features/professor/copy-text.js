import { Platform, Share } from 'react-native';

export async function copyText(value) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return { ok: true, message: 'Código copiado.' };
  }
  try {
    const result = await Share.share({ message: value });
    if (result.action === Share.dismissedAction) return { ok: false, message: null };
    return { ok: true, message: 'Código pronto para compartilhar.' };
  } catch {
    return { ok: false, message: 'Não foi possível copiar o código neste aparelho.' };
  }
}
