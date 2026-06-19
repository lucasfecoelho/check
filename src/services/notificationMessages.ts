type DayProgress = {
  completedCount: number;
  totalCount: number;
};

type QuantitativeProgress = {
  current: number | string;
  target: number | string;
  unit?: string;
};

type BaseNotificationContext = {
  dayProgress?: DayProgress | null;
  quantitativeProgress?: QuantitativeProgress | null;
  title: string;
};

type HabitNotificationContext = BaseNotificationContext & {
  currentStreak?: number | null;
};

type TaskNotificationContext = BaseNotificationContext & {
  reminderLeadLabel?: string;
  time: string;
};

export type NotificationContent = {
  body: string;
  title: string;
};

function normalizeTitle(title: string) {
  return title.trim();
}

function getRemainingCount(progress?: DayProgress | null) {
  if (!progress || progress.totalCount <= 0) {
    return null;
  }

  return Math.max(progress.totalCount - progress.completedCount, 0);
}

function getProgressText(progress?: DayProgress | null) {
  if (!progress || progress.totalCount <= 0) {
    return null;
  }

  return `Você já concluiu ${progress.completedCount} de ${progress.totalCount} itens hoje.`;
}

function getQuantitativeText(context: BaseNotificationContext) {
  const progress = context.quantitativeProgress;

  if (!progress) {
    return null;
  }

  const unit = progress.unit ? ` ${progress.unit}` : '';

  return `Você já fez ${progress.current}${unit} de ${progress.target}${unit} em ${normalizeTitle(
    context.title
  )}.`;
}

function formatAmount(value: number | string) {
  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return Number.isInteger(numericValue) ? String(numericValue) : String(Number(numericValue.toFixed(2)));
}

export function buildHabitNotificationContent(
  context: HabitNotificationContext
): NotificationContent | null {
  const title = normalizeTitle(context.title);
  const remainingCount = getRemainingCount(context.dayProgress);

  if (remainingCount === 0) {
    return null;
  }

  const quantitativeText = getQuantitativeText(context);

  if (quantitativeText) {
    return {
      body: quantitativeText,
      title: 'Check: ainda dá tempo',
    };
  }

  if (context.currentStreak && context.currentStreak >= 2) {
    return {
      body: `Você está com ${context.currentStreak} dias de sequência em ${title}. Não deixe cair hoje.`,
      title: 'Check: sua sequência',
    };
  }

  if (remainingCount !== null && remainingCount <= 2 && context.dayProgress?.completedCount) {
    return {
      body: `Falta pouco para fechar sua rotina do dia. ${title} ainda está pendente.`,
      title: 'Check: falta pouco',
    };
  }

  const progressText = getProgressText(context.dayProgress);

  if (progressText) {
    return {
      body: `${progressText} ${title} ainda está no plano.`,
      title: 'Check: rotina de hoje',
    };
  }

  return {
    body: `Você ainda não concluiu ${title} hoje.`,
    title: 'Check: hábito de hoje',
  };
}

export function buildWaterReminderNotificationContent(
  context: BaseNotificationContext
): NotificationContent | null {
  const progress = context.quantitativeProgress;

  if (!progress) {
    return {
      body: 'Hora de beber água.',
      title: 'Check: hidratação',
    };
  }

  const current = typeof progress.current === 'number' ? progress.current : Number(progress.current);
  const target = typeof progress.target === 'number' ? progress.target : Number(progress.target);
  const unit = progress.unit ? progress.unit : '';
  const unitLabel = unit ? unit : '';

  if (Number.isFinite(current) && Number.isFinite(target) && target > 0 && current >= target) {
    return null;
  }

  if (Number.isFinite(current) && current > 0) {
    return {
      body: `Você já bebeu ${formatAmount(current)}${unitLabel} de ${formatAmount(target)}${unitLabel} hoje. Falta pouco.`,
      title: 'Check: água',
    };
  }

  return {
    body: 'Ainda dá tempo de alcançar sua meta de água hoje.',
    title: 'Check: água',
  };
}

export function buildTaskNotificationContent(
  context: TaskNotificationContext,
  type: 'before-due' | 'due'
): NotificationContent | null {
  const title = normalizeTitle(context.title);
  const remainingCount = getRemainingCount(context.dayProgress);

  if (remainingCount === 0) {
    return null;
  }

  if (type === 'before-due') {
    const progressText = getProgressText(context.dayProgress);

    if (remainingCount !== null && remainingCount <= 2 && context.dayProgress?.completedCount) {
      return {
        body: `Falta pouco para fechar sua rotina do dia. ${title} vence em ${context.reminderLeadLabel}.`,
        title: 'Check: quase lá',
      };
    }

    return {
      body: progressText
        ? `${progressText} ${title} vence em ${context.reminderLeadLabel}.`
        : `${title} vence em ${context.reminderLeadLabel}.`,
      title: 'Check: lembrete de tarefa',
    };
  }

  return {
    body: `Ainda dá tempo de concluir ${title} hoje. Prazo ${context.time}.`,
    title: 'Check: prazo agora',
  };
}
