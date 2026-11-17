import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { pendingMessages } from '@/content/messages';
import { roleLabel } from '@/domain';
import { CatalogGate } from '@/features/shared/catalog-gate';
import { useAuth } from '@/state/auth-session';
import { useCatalog } from '@/state/catalog';
export function ProfileScreen({
  role
}) {
  const router = useRouter();
  const catalog = useCatalog();
  const auth = useAuth();
  const [leaving, setLeaving] = useState(false);
  const profile = catalog.profile;
  async function leave() {
    setLeaving(true);
    if (catalog.mode === 'live') await auth.signOut();
    router.replace('/');
  }
  if (!profile) {
    return <CatalogGate title="Perfil">
        {null}
      </CatalogGate>;
  }
  return <CatalogGate title="Perfil">
    <Screen tone="brand" title="Perfil" subtitle={catalog.mode === 'demo' ? `${roleLabel(role)} · demonstração` : roleLabel(profile.role)} safeBottom={false}>
      <Card>
        <Avatar name={profile.name} size={64} />
        <InfoRow label="Nome" value={profile.name} />
        <InfoRow label="E-mail" value={profile.email} />
        <InfoRow label="Instituição" value={profile.institution} />
        <InfoRow label="Curso" value={profile.course} />
        <InfoRow label="Vínculo" value={roleLabel(profile.role)} />
        <InfoRow label={profile.identifierLabel} value={profile.identifier} />
      </Card>
      <Notice message={pendingMessages.profile} />
      <Button label={catalog.mode === 'demo' ? 'Sair da demonstração' : leaving ? 'Saindo…' : 'Sair'} variant="secondary" icon="leave" disabled={leaving} onPress={() => void leave()} />
    </Screen>
    </CatalogGate>;
}
