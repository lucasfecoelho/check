import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import {
  DATE_KEY_FORMAT,
  formatDateKeyForDisplay,
  isDateKeyValid,
  parseDateKey,
} from '@/database/date';
import { radius, spacing, typography, useThemeColors } from '@/theme';

import { AppText } from './AppText';

type DatePickerFieldProps = {
  dateKey: string;
  onChange: (dateKey: string) => void;
};

const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function getDateKey(date: Date) {
  return format(date, DATE_KEY_FORMAT);
}

export function DatePickerField({ dateKey, onChange }: DatePickerFieldProps) {
  const colors = useThemeColors();
  const selectedDate = isDateKeyValid(dateKey) ? parseDateKey(dateKey) : new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(startOfMonth(selectedDate));
  const modalProgress = useRef(new Animated.Value(0)).current;

  const days = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);

    return eachDayOfInterval({ end: monthEnd, start: monthStart });
  }, [visibleMonth]);

  const monthOffset = getDay(startOfMonth(visibleMonth));
  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    modalProgress.setValue(0);
    Animated.timing(modalProgress, {
      duration: 160,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [isOpen, modalProgress]);

  function handleOpen() {
    setVisibleMonth(startOfMonth(selectedDate));
    setIsOpen(true);
  }

  function handleSelectDate(date: Date) {
    onChange(getDateKey(date));
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.fieldButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          pressed && styles.pressed,
        ]}>
        <CalendarDays color={colors.textMuted} size={18} strokeWidth={2.2} />
        <AppText variant="bodyStrong">{formatDateKeyForDisplay(dateKey)}</AppText>
      </Pressable>

      <Modal animationType="fade" transparent visible={isOpen}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.48)' }]}>
          <Animated.View
            style={[
              styles.modal,
              { backgroundColor: colors.surface },
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
            <View style={styles.modalHeader}>
              <Pressable
                accessibilityLabel="Mês anterior"
                accessibilityRole="button"
                onPress={() => setVisibleMonth((currentMonth) => subMonths(currentMonth, 1))}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: colors.primarySoft },
                  pressed && styles.pressed,
                ]}>
                <ChevronLeft color={colors.primary} size={22} strokeWidth={2.4} />
              </Pressable>

              <AppText style={styles.monthTitle} variant="bodyStrong">
                {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </AppText>

              <Pressable
                accessibilityLabel="Próximo mês"
                accessibilityRole="button"
                onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: colors.primarySoft },
                  pressed && styles.pressed,
                ]}>
                <ChevronRight color={colors.primary} size={22} strokeWidth={2.4} />
              </Pressable>
            </View>

            <View style={styles.weekdays}>
              {weekdays.map((weekday, index) => (
                <AppText color={colors.textMuted} key={`${weekday}-${index}`} style={styles.weekday} variant="caption">
                  {weekday}
                </AppText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {Array.from({ length: monthOffset }).map((_, index) => (
                <View key={`empty-${index}`} style={styles.dayButton} />
              ))}

              {days.map((day) => {
                const currentDateKey = getDateKey(day);
                const isSelected = currentDateKey === dateKey;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={currentDateKey}
                    onPress={() => handleSelectDate(day)}
                    style={({ pressed }) => [
                      styles.dayButton,
                      isSelected && { backgroundColor: colors.primary },
                      pressed && styles.pressed,
                    ]}>
                    <AppText
                      color={isSelected ? colors.onPrimary : colors.text}
                      variant={isSelected ? 'bodyStrong' : 'body'}>
                      {format(day, 'd')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectDate(new Date())}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                <AppText color={colors.primary} variant="bodyStrong">
                  Hoje
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
                <AppText color={colors.textMuted} variant="bodyStrong">
                  Cancelar
                </AppText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fieldButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.72,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modal: {
    borderRadius: radius.xl,
    gap: spacing.lg,
    maxWidth: 420,
    padding: spacing.xl,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  monthTitle: {
    flex: 1,
    fontSize: typography.sizes.bodyLarge,
    textAlign: 'center',
  },
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.xs,
  },
  dayButton: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 42,
    justifyContent: 'center',
    width: `${100 / 7}%`,
  },
  dayButtonSelected: {
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: radius.md,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
