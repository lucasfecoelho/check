import { useFocusEffect } from 'expo-router';
import { Bell, Clock3, Database, Moon, Smartphone } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppScreen, AppText, Card, PrimaryButton, SectionHeader } from '@/components';
import { getSettings, initDatabase, updateSetting } from '@/database';
import { DEFAULT_TASK_TIME, isTaskTimeValid } from '@/database/date';
import { colors, radius, spacing, typography } from '@/theme';

type ThemePreference = 'light' | 'dark';

const appInfo = [
  {
    icon: Smartphone,
    label: 'Check',
    value: 'App pessoal para tarefas e hábitos',
  },
  {
    icon: Database,
    label: 'Dados locais',
    value: 'SQLite local no aparelho',
  },
  {
    icon: Moon,
    label: 'Versão 0.1.0',
    value: 'MVP em tema claro',
  },
];

async function getNotificationService() {
  try {
    return await import('@/services/notifications');
  } catch (error) {
    console.warn('[Check][notifications] Failed to load notification service', error);
    return null;
  }
}

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultTaskTime, setDefaultTaskTime] = useState(DEFAULT_TASK_TIME);
  const [draftDefaultTime, setDraftDefaultTime] = useState(DEFAULT_TASK_TIME);
  const [themePreference, setThemePreference] = useState<ThemePreference>('light');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);

  const loadSettings = useCallback(async () => {
    await initDatabase();
    const settings = await getSettings();
    const defaultTime = settings.find((setting) => setting.key === 'default_task_time')?.value;
    const resolvedTime = defaultTime ?? DEFAULT_TASK_TIME;
    const theme = settings.find((setting) => setting.key === 'theme')?.value;

    const notificationsSetting = settings.find((setting) => setting.key === 'notifications_enabled')?.value;
    const notificationService = await getNotificationService();
    const enabled = notificationService
      ? await notificationService.areNotificationsEnabled()
      : notificationsSetting !== 'false';

    setDefaultTaskTime(resolvedTime);
    setDraftDefaultTime(resolvedTime);
    setThemePreference(theme === 'dark' ? 'dark' : 'light');
    setNotificationsEnabled(enabled);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings().catch(console.error);
    }, [loadSettings])
  );

  async function handleToggleNotifications(value: boolean) {
    setIsUpdating(true);
    setPermissionDenied(false);

    const notificationService = await getNotificationService();

    if (!notificationService) {
      await updateSetting('notifications_enabled', value ? 'true' : 'false');
      setNotificationsEnabled(value);
      setPermissionDenied(value);
      setIsUpdating(false);
      return;
    }

    if (value) {
      const granted = await notificationService.requestNotificationPermission();

      if (!granted) {
        await notificationService.updateNotificationsEnabled(false);
        setNotificationsEnabled(false);
        setPermissionDenied(true);
        setIsUpdating(false);
        return;
      }
    }

    const enabled = await notificationService.updateNotificationsEnabled(value);
    setNotificationsEnabled(enabled);
    setPermissionDenied(value && !enabled);
    setIsUpdating(false);
  }

  async function handleSaveDefaultTime() {
    const normalizedTime = draftDefaultTime.trim();

    setTimeError(null);

    if (!isTaskTimeValid(normalizedTime)) {
      setTimeError('Use o formato HH:mm, por exemplo 20:00.');
      return;
    }

    setIsSavingTime(true);
    await updateSetting('default_task_time', normalizedTime);
    setDefaultTaskTime(normalizedTime);
    setDraftDefaultTime(normalizedTime);
    setIsSavingTime(false);
  }

  async function handleChangeThemePreference(value: ThemePreference) {
    setThemePreference(value);
    await updateSetting('theme', value);
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppText variant="heading">Configurações</AppText>
        <AppText color={colors.textMuted}>Preferências locais do Check para Android.</AppText>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Lembretes" subtitle="Notificações locais no aparelho" />
        <Card>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Bell color={colors.primary} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">Notificações</AppText>
              <AppText color={colors.textMuted}>
                {notificationsEnabled
                  ? 'Tarefas e hábitos podem gerar lembretes'
                  : 'Nenhum lembrete será agendado'}
              </AppText>
              {permissionDenied ? (
                <AppText color={colors.danger} variant="caption">
                  Permissão negada. Ative nas configurações do Android para receber lembretes.
                </AppText>
              ) : null}
            </View>
            <Switch
              disabled={isUpdating}
              onValueChange={handleToggleNotifications}
              thumbColor={notificationsEnabled ? colors.primary : colors.textSoft}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              value={notificationsEnabled}
            />
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Padrões" subtitle="Valores usados ao criar novos itens" />
        <Card style={styles.timeCard}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Clock3 color={colors.primary} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">Horário padrão de tarefas</AppText>
              <AppText color={colors.textMuted}>
                Horário vazio salva {defaultTaskTime}
              </AppText>
            </View>
          </View>

          <View style={styles.timeEditor}>
            <TextInput
              keyboardType="numbers-and-punctuation"
              onChangeText={setDraftDefaultTime}
              placeholder={DEFAULT_TASK_TIME}
              placeholderTextColor={colors.textSoft}
              style={styles.input}
              value={draftDefaultTime}
            />
            <PrimaryButton
              disabled={isSavingTime}
              label={isSavingTime ? 'Salvando...' : 'Salvar'}
              onPress={handleSaveDefaultTime}
              style={styles.saveButton}
            />
          </View>
          {timeError ? (
            <View style={styles.errorBox}>
              <AppText color={colors.danger} variant="caption">
                {timeError}
              </AppText>
            </View>
          ) : null}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Aparência" subtitle="Preferência visual do app" />
        <Card>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Moon color={colors.primary} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">Tema</AppText>
              <AppText color={colors.textMuted}>
                {themePreference === 'dark' ? 'Escuro selecionado' : 'Claro selecionado'}
              </AppText>
            </View>
          </View>

          <View style={styles.segmented}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleChangeThemePreference('light').catch(console.error)}
              style={[
                styles.segment,
                themePreference === 'light' && styles.segmentSelected,
              ]}>
              <AppText
                color={themePreference === 'light' ? colors.primary : colors.textMuted}
                variant="bodyStrong">
                Claro
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleChangeThemePreference('dark').catch(console.error)}
              style={[
                styles.segment,
                themePreference === 'dark' && styles.segmentSelected,
              ]}>
              <AppText
                color={themePreference === 'dark' ? colors.primary : colors.textMuted}
                variant="bodyStrong">
                Escuro
              </AppText>
            </Pressable>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Sobre o app" subtitle="Escopo do MVP" />
        <View style={styles.list}>
          {appInfo.map((item) => (
            <Card key={item.label}>
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  <item.icon color={colors.primary} size={22} strokeWidth={2.2} />
                </View>
                <View style={styles.copy}>
                  <AppText variant="bodyStrong">{item.label}</AppText>
                  <AppText color={colors.textMuted}>{item.value}</AppText>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  timeCard: {
    gap: spacing.lg,
  },
  timeEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    minWidth: 104,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  segmented: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.xs,
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  segmentSelected: {
    backgroundColor: colors.surface,
  },
});
