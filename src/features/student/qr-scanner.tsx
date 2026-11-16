import { useIsFocused } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { palette, radius, spacing } from '@/theme';

type QrScannerProps = {
  onScan: (value: string) => void;
  onClose: () => void;
};

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [activeApp, setActiveApp] = useState(AppState.currentState === 'active');
  const locked = useRef(false);
  const asked = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setActiveApp(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (permission || asked.current) return;
    asked.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  const cameraOn = focused && activeApp && permission?.granted === true;

  if (!permission || permission.status === 'undetermined') {
    return (
      <View style={styles.frame}>
        <AppText size="body" align="center">
          Para ler o QR Code, o Presença+ precisa usar a câmera traseira.
        </AppText>
        <Button label="Permitir câmera" onPress={() => void requestPermission()} />
        <Button label="Cancelar" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.frame}>
        <AppText size="body" align="center">
          A câmera está bloqueada. Você ainda pode digitar o código de seis dígitos.
        </AppText>
        <Button label="Abrir configurações" onPress={() => void Linking.openSettings()} />
        <Button label="Voltar ao código" variant="secondary" onPress={onClose} />
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      {cameraOn ? (
        <CameraView
          style={styles.camera}
          facing="back"
          active
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={(result) => {
            if (locked.current || !result.data) return;
            locked.current = true;
            onScan(result.data);
          }}
        />
      ) : (
        <View style={styles.paused}>
          <AppText size="body" tone="inverse" align="center">
            A câmera fica pausada quando esta tela não está ativa.
          </AppText>
        </View>
      )}
      <Button label="Cancelar leitura" variant="secondary" onPress={onClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cameraWrap: {
    gap: spacing.md,
  },
  camera: {
    width: '100%',
    height: 320,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  paused: {
    height: 320,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: palette.blue,
  },
});
