import { Tabs } from 'expo-router';
import { CalendarCheck2, ListTodo, Repeat2, Settings } from 'lucide-react-native';

import { colors, typography } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarLabelStyle: {
          fontSize: typography.sizes.caption,
          fontWeight: typography.weights.medium,
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoje',
          tabBarIcon: ({ color, size }) => (
            <CalendarCheck2 color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color, size }) => (
            <ListTodo color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ color, size }) => (
            <Repeat2 color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
