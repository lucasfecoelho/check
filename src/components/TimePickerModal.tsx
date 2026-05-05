import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  View,
} from 'react-native';

import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';

type TimePickerModalProps = {
  initialValue: string;
  onCancel: () => void;
  onConfirm: (time: string) => void;
  visible: boolean;
};

const hours = Array.from({ length: 24 }, (_, index) => index);
const minutes = Array.from({ length: 60 }, (_, index) => index);
const itemHeight = 44;

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

function parseTimeParts(time: string) {
  const [hour = 20, minute = 0] = time.split(':').map(Number);

  return {
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 20,
    minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0,
  };
}

type TimeColumnProps = {
  label: string;
  onSelect: (value: number) => void;
  selectedValue: number;
  values: number[];
};

function TimeColumn({ label, onSelect, selectedValue, values }: TimeColumnProps) {
  const colors = useThemeColors();
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    const index = values.indexOf(selectedValue);

    if (index < 0) {
      return;
    }

    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({
        animated: false,
        index,
        viewPosition: 0.5,
      });
    }, 50);

    return () => clearTimeout(timeout);
  }, [selectedValue, values]);

  return (
    <View style={styles.column}>
      <AppText color={colors.textMuted} variant="caption">
        {label}
      </AppText>
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.listContent}
        data={values}
        getItemLayout={(_, index) => ({
          index,
          length: itemHeight,
          offset: itemHeight * index,
        })}
        keyExtractor={(item) => String(item)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isSelected = item === selectedValue;

          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(item)}
              style={({ pressed }) => [
                styles.option,
                isSelected && {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primary,
                  borderWidth: 1,
                },
                pressed && styles.pressed,
              ]}>
              <AppText color={isSelected ? colors.primary : colors.text} variant="bodyStrong">
                {padTime(item)}
              </AppText>
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        style={[
          styles.list,
          {
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.border,
          },
        ]}
      />
    </View>
  );
}

export function TimePickerModal({
  initialValue,
  onCancel,
  onConfirm,
  visible,
}: TimePickerModalProps) {
  const colors = useThemeColors();
  const [selectedHour, setSelectedHour] = useState(20);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const modalProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const parts = parseTimeParts(initialValue);

    setSelectedHour(parts.hour);
    setSelectedMinute(parts.minute);
    modalProgress.setValue(0);
    Animated.timing(modalProgress, {
      duration: 160,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [initialValue, modalProgress, visible]);

  function stopCardPress(event: GestureResponderEvent) {
    event.stopPropagation();
  }

  function handleConfirm() {
    onConfirm(`${padTime(selectedHour)}:${padTime(selectedMinute)}`);
  }

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.52)' }]}>
        <Animated.View
          style={[
            styles.modalMotion,
            {
              opacity: modalProgress,
              transform: [
                {
                  translateY: modalProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
                {
                  scale: modalProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}>
          <Pressable
            onPress={stopCardPress}
            style={[styles.modal, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
              <AppText variant="bodyStrong">Escolher horário</AppText>
              <View
                style={[
                  styles.selectedTimePill,
                  { backgroundColor: colors.primarySoft, borderColor: colors.border },
                ]}>
                <AppText color={colors.primary} style={styles.selectedTime} variant="heading">
                  {padTime(selectedHour)}:{padTime(selectedMinute)}
                </AppText>
              </View>
            </View>

            <View style={styles.columns}>
              <TimeColumn
                label="Hora"
                onSelect={setSelectedHour}
                selectedValue={selectedHour}
                values={hours}
              />
              <TimeColumn
                label="Minuto"
                onSelect={setSelectedMinute}
                selectedValue={selectedMinute}
                values={minutes}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="Cancelar escolha de horário"
                accessibilityRole="button"
                hitSlop={6}
                onPress={onCancel}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
                <AppText color={colors.textMuted} variant="bodyStrong">
                  Cancelar
                </AppText>
              </Pressable>
              <Pressable
                accessibilityLabel={`Confirmar horário ${padTime(selectedHour)}:${padTime(selectedMinute)}`}
                accessibilityRole="button"
                hitSlop={6}
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.confirmButton,
                  { backgroundColor: colors.primary },
                  pressed && styles.pressed,
                ]}>
                <AppText color={colors.onPrimary} variant="bodyStrong">
                  Confirmar
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalMotion: {
    maxWidth: 420,
    width: '100%',
  },
  modal: {
    borderRadius: radius.lg,
    gap: spacing.lg,
    maxHeight: '86%',
    padding: spacing.lg,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  selectedTime: {
    textAlign: 'center',
  },
  selectedTimePill: {
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  columns: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  column: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    height: 220,
    overflow: 'hidden',
  },
  listContent: {
    padding: spacing.sm,
  },
  option: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: itemHeight,
    justifyContent: 'center',
  },
  optionSelected: {
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  confirmButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.72,
  },
});
