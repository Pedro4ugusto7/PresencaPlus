import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type IconName } from '@/components/ui/app-icon';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoMark } from '@/components/ui/logo-mark';
import { maxContentWidth, palette, radius, spacing } from '@/theme';

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'classes',
    title: 'Gestão de turmas',
    text: 'Disciplinas, horários e alunos organizados para o dia de aula.',
  },
  {
    icon: 'call',
    title: 'Chamada da aula',
    text: 'Código da aula e lista de presença em uma tela só.',
  },
  {
    icon: 'reports',
    title: 'Indicadores',
    text: 'Frequência por turma, com destaque para quem está abaixo de 75%.',
  },
  {
    icon: 'school',
    title: 'Visão do aluno',
    text: 'Cada estudante acompanha disciplinas e histórico de frequência.',
  },
];

export function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);

  return (
    <View style={styles.root}>
      <StatusBar style={scrolled ? 'dark' : 'light'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(event) => setScrolled(event.nativeEvent.contentOffset.y > 48)}>
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xxl }]}>
          <LogoMark />
          <AppText size="display" tone="inverse" align="center">
            Presença+
          </AppText>
          <AppText size="caption" align="center" style={styles.kicker}>
            CONTROLE DE CHAMADAS
          </AppText>
          <AppText size="body" align="center" style={styles.tagline}>
            Frequência acadêmica clara para professores e alunos.
          </AppText>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
          <Card>
            <Button label="Entrar" onPress={() => router.push('/login')} />
            <Button
              label="Recuperar senha"
              variant="ghost"
              onPress={() => router.push('/recuperar-senha')}
            />
          </Card>

          <View style={styles.features}>
            {features.map((feature) => (
              <View key={feature.title} style={styles.feature}>
                <View style={styles.featureIcon}>
                  <AppIcon name={feature.icon} size={20} />
                </View>
                <View style={styles.featureText}>
                  <AppText size="label">{feature.title}</AppText>
                  <AppText size="caption" tone="muted">
                    {feature.text}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <AppText size="caption" tone="muted" align="center">
            O acesso é fornecido pela instituição. A pré-visualização local continua na tela de entrar.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: palette.blue,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl + spacing.md,
    gap: spacing.sm,
  },
  kicker: {
    color: palette.inverseMuted,
    letterSpacing: 1.4,
  },
  tagline: {
    color: palette.white,
    maxWidth: 320,
  },
  sheet: {
    marginTop: -spacing.xl,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  features: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: palette.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
});
