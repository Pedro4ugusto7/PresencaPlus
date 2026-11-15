import { useRouter } from 'expo-router';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoRow } from '@/components/ui/info-row';
import { Notice } from '@/components/ui/notice';
import { Screen } from '@/components/ui/screen';
import { pendingMessages } from '@/content/messages';
import { previewSource } from '@/data';
import { roleLabel, type UserRole } from '@/domain';

type ProfileScreenProps = {
  role: UserRole;
};

export function ProfileScreen({ role }: ProfileScreenProps) {
  const router = useRouter();
  const profile = previewSource.getProfile(role);

  return (
    <Screen
      tone="brand"
      title="Perfil"
      subtitle={`${roleLabel(role)} · demonstração`}
      safeBottom={false}>
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
      <Button
        label="Sair da demonstração"
        variant="secondary"
        icon="leave"
        onPress={() => router.replace('/')}
      />
    </Screen>
  );
}
