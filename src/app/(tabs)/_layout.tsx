import { Tabs } from 'expo-router';
import { CircleUser, Home, ListTodo, Repeat2 } from 'lucide-react-native';

import { useThemeColors } from '@/theme';

export default function TabsLayout() {
  const colors = useThemeColors();

  function getTabColor(focused: boolean, activeColor: string) {
    return focused ? activeColor : colors.textSoft;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarShowLabel: false,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58,
          paddingBottom: 6,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused, size }) => (
            <Home
              color={getTabColor(focused, colors.primary)}
              size={size}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ focused, size }) => (
            <ListTodo
              color={getTabColor(focused, colors.task)}
              size={size}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Hábitos',
          tabBarIcon: ({ focused, size }) => (
            <Repeat2
              color={getTabColor(focused, colors.habit)}
              size={size}
              strokeWidth={2.2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused, size }) => (
            <CircleUser
              color={getTabColor(focused, colors.settings)}
              size={size}
              strokeWidth={2.2}
            />
          ),
        }}
      />
    </Tabs>
  );
}
