import { ClipboardList, NotebookPen, StickyNote, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import type { NotebookEntry, NotebookEntryType } from '@/database';
import { radius, spacing, useThemeColors } from '@/theme';

import { AppText } from './AppText';
import { Card } from './Card';

type NotebookCardProps = {
  entry: NotebookEntry;
  onPress?: (id: string) => void;
};

const entryTypeMeta: Record<
  NotebookEntryType,
  {
    icon: LucideIcon;
    label: string;
  }
> = {
  list: {
    icon: ClipboardList,
    label: 'Lista',
  },
  note: {
    icon: StickyNote,
    label: 'Nota',
  },
  task: {
    icon: NotebookPen,
    label: 'Tarefa',
  },
};

function formatEntryDate(entry: NotebookEntry) {
  const wasUpdated = entry.updated_at !== entry.created_at;
  const label = wasUpdated ? 'Atualizada' : 'Criada';
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(wasUpdated ? entry.updated_at : entry.created_at));

  return `${label} em ${date}`;
}

export function NotebookCard({ entry, onPress }: NotebookCardProps) {
  const colors = useThemeColors();
  const metadata = entryTypeMeta[entry.type];
  const Icon = metadata.icon;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(entry.id)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Card>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Icon color={colors.primary} size={20} strokeWidth={2.2} />
          </View>

          <View style={styles.content}>
            <AppText numberOfLines={2} variant="bodyStrong">
              {entry.title}
            </AppText>

            {entry.content ? (
              <AppText color={colors.textMuted} numberOfLines={2}>
                {entry.content}
              </AppText>
            ) : null}

            <View style={styles.metaRow}>
              <View style={[styles.chip, { backgroundColor: colors.surfaceMuted }]}>
                <AppText color={colors.primary} variant="caption">
                  {metadata.label}
                </AppText>
              </View>

              <AppText color={colors.textMuted} variant="caption">
                {formatEntryDate(entry)}
              </AppText>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.sm,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
