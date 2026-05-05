import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Bell, Camera, Clock3, Moon, User } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { AppScreen, AppText, Card, PrimaryButton, SectionHeader } from '@/components';
import { getSettings, initDatabase, updateSetting } from '@/database';
import { DEFAULT_TASK_TIME, isTaskTimeValid } from '@/database/date';
import { radius, spacing, typography, useAppTheme, type ThemePreference } from '@/theme';

type TaskReminderLeadMinutes = 10 | 30 | 60;

const taskReminderOptions: { label: string; value: TaskReminderLeadMinutes }[] = [
  { label: '10 min', value: 10 },
  { label: '30 min', value: 30 },
  { label: '1 hora', value: 60 },
];

async function getNotificationService() {
  try {
    return await import('@/services/notifications');
  } catch (error) {
    console.warn('[Check][notifications] Failed to load notification service', error);
    return null;
  }
}

export default function ProfileScreen() {
  const { colors, preference: themePreference, setPreference: setThemePreference } = useAppTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultTaskTime, setDefaultTaskTime] = useState(DEFAULT_TASK_TIME);
  const [draftDefaultTime, setDraftDefaultTime] = useState(DEFAULT_TASK_TIME);
  const [profileName, setProfileName] = useState('');
  const [draftProfileName, setDraftProfileName] = useState('');
  const [profileAvatarUri, setProfileAvatarUri] = useState('');
  const [taskReminderLeadMinutes, setTaskReminderLeadMinutes] =
    useState<TaskReminderLeadMinutes>(30);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isSavingTime, setIsSavingTime] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const loadSettings = useCallback(async () => {
    await initDatabase();
    const settings = await getSettings();
    const defaultTime = settings.find((setting) => setting.key === 'default_task_time')?.value;
    const resolvedTime = defaultTime ?? DEFAULT_TASK_TIME;
    const name = settings.find((setting) => setting.key === 'profile_name')?.value ?? '';
    const avatarUri = settings.find((setting) => setting.key === 'profile_avatar_uri')?.value ?? '';
    const reminderLeadSetting = settings.find(
      (setting) => setting.key === 'task_reminder_lead_minutes'
    )?.value;
    const reminderLead = Number(reminderLeadSetting);

    const notificationsSetting = settings.find((setting) => setting.key === 'notifications_enabled')?.value;
    const notificationService = await getNotificationService();
    const enabled = notificationService
      ? await notificationService.areNotificationsEnabled()
      : notificationsSetting !== 'false';

    setDefaultTaskTime(resolvedTime);
    setDraftDefaultTime(resolvedTime);
    setProfileName(name);
    setDraftProfileName(name);
    setProfileAvatarUri(avatarUri);
    setTaskReminderLeadMinutes(
      taskReminderOptions.some((option) => option.value === reminderLead)
        ? (reminderLead as TaskReminderLeadMinutes)
        : 30
    );
    setNotificationsEnabled(enabled);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings().catch(console.error);
    }, [loadSettings])
  );

  async function handleSaveProfileName() {
    const normalizedName = draftProfileName.trim();

    setIsSavingProfile(true);
    await updateSetting('profile_name', normalizedName);
    setProfileName(normalizedName);
    setDraftProfileName(normalizedName);
    setIsSavingProfile(false);
  }

  async function handlePickProfilePhoto() {
    if (isPickingAvatar) {
      return;
    }

    setIsPickingAvatar(true);

    try {
      const currentPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permissão necessária',
          'Permita o acesso às fotos para escolher uma imagem do perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled) {
        return;
      }

      const selectedUri = result.assets[0]?.uri;

      if (!selectedUri) {
        Alert.alert('Foto não selecionada', 'Não foi possível carregar a imagem escolhida.');
        return;
      }

      await updateSetting('profile_avatar_uri', selectedUri);
      setProfileAvatarUri(selectedUri);
    } catch (error) {
      console.warn('[Check][profile] Failed to pick profile photo', error);
      Alert.alert('Não foi possível alterar a foto', 'Tente escolher outra imagem da galeria.');
    } finally {
      setIsPickingAvatar(false);
    }
  }

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

  async function handleChangeTaskReminderLead(value: TaskReminderLeadMinutes) {
    setTaskReminderLeadMinutes(value);
    await updateSetting('task_reminder_lead_minutes', String(value));
  }

  async function handleChangeThemePreference(value: ThemePreference) {
    await setThemePreference(value);
  }

  const profileInitial = profileName.trim().charAt(0).toUpperCase();

  return (
    <AppScreen>
      <View style={styles.header}>
        <AppText variant="heading">Perfil</AppText>
        <AppText color={colors.textMuted}>Preferências locais do Check para Android.</AppText>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Pressable
            accessibilityLabel="Alterar foto do perfil"
            accessibilityRole="button"
            disabled={isPickingAvatar}
            onPress={handlePickProfilePhoto}
            style={({ pressed }) => [
              styles.avatarWrap,
              { backgroundColor: colors.primarySoft, borderColor: colors.border },
              pressed && styles.pressed,
              isPickingAvatar && styles.avatarDisabled,
            ]}>
            {profileAvatarUri ? (
              <Image source={{ uri: profileAvatarUri }} style={styles.avatarImage} />
            ) : profileInitial ? (
              <AppText color={colors.primary} style={styles.avatarInitial} variant="heading">
                {profileInitial}
              </AppText>
            ) : (
              <User color={colors.primary} size={34} strokeWidth={2.2} />
            )}
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}>
              <Camera color={colors.primary} size={14} strokeWidth={2.2} />
            </View>
          </Pressable>

          <View style={styles.profileCopy}>
            <AppText variant="title">{profileName || 'Seu perfil'}</AppText>
            <AppText color={colors.textMuted}>Perfil salvo apenas neste aparelho.</AppText>
            <Pressable
              accessibilityRole="button"
              disabled={isPickingAvatar}
              onPress={handlePickProfilePhoto}
              style={({ pressed }) => [
                styles.photoButton,
                { backgroundColor: colors.primarySoft },
                pressed && styles.pressed,
                isPickingAvatar && styles.avatarDisabled,
              ]}>
              <Camera color={colors.primary} size={15} strokeWidth={2.2} />
              <AppText color={colors.primary} variant="caption">
                {isPickingAvatar ? 'Abrindo galeria...' : 'Alterar foto'}
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.profileEditor}>
          <TextInput
            autoCapitalize="words"
            onChangeText={setDraftProfileName}
            placeholder="Seu nome"
            placeholderTextColor={colors.textSoft}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={draftProfileName}
          />
          <PrimaryButton
            disabled={isSavingProfile}
            label={isSavingProfile ? 'Salvando...' : 'Salvar'}
            onPress={handleSaveProfileName}
            style={styles.saveButton}
          />
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Configurações" subtitle="Preferências do app" />

        <Card>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.notificationSoft },
              ]}>
              <Bell color={colors.notification} size={22} strokeWidth={2.2} />
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

        <Card style={styles.reminderCard}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.notificationSoft },
              ]}>
              <Clock3 color={colors.notification} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">Aviso antes do prazo</AppText>
              <AppText color={colors.textMuted}>
                Usado nas novas tarefas e nas tarefas editadas.
              </AppText>
            </View>
          </View>

          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            {taskReminderOptions.map((option) => {
              const isSelected = option.value === taskReminderLeadMinutes;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={option.value}
                  onPress={() => handleChangeTaskReminderLead(option.value).catch(console.error)}
                  style={[
                    styles.segment,
                    isSelected && { backgroundColor: colors.surface },
                  ]}>
                  <AppText
                    color={isSelected ? colors.primary : colors.textMuted}
                    variant="bodyStrong">
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.timeCard}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.taskSoft }]}>
              <Clock3 color={colors.task} size={22} strokeWidth={2.2} />
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
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
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
            <View style={[styles.errorBox, { backgroundColor: colors.dangerSoft }]}>
              <AppText color={colors.danger} variant="caption">
                {timeError}
              </AppText>
            </View>
          ) : null}
        </Card>

        <Card>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.settingsSoft }]}>
              <Moon color={colors.settings} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyStrong">Tema</AppText>
              <AppText color={colors.textMuted}>
                {themePreference === 'dark' ? 'Escuro selecionado' : 'Claro selecionado'}
              </AppText>
            </View>
          </View>

          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleChangeThemePreference('light').catch(console.error)}
              style={[
                styles.segment,
                themePreference === 'light' && { backgroundColor: colors.surface },
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
                themePreference === 'dark' && { backgroundColor: colors.surface },
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
        <SectionHeader title="Sobre o app" />
        <Card>
          <AppText variant="bodyStrong">Versão 1.2.5</AppText>
        </Card>
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
  profileCard: {
    gap: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  avatarWrap: {
    alignItems: 'center',
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  avatarDisabled: {
    opacity: 0.6,
  },
  avatarImage: {
    borderRadius: 36,
    height: 72,
    width: 72,
  },
  avatarInitial: {
    textAlign: 'center',
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    bottom: -2,
    height: 26,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 26,
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  photoButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
  },
  profileEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
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
  reminderCard: {
    gap: spacing.lg,
  },
  timeEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  saveButton: {
    minWidth: 104,
  },
  errorBox: {
    borderRadius: radius.md,
    padding: spacing.md,
  },
  segmented: {
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
});
