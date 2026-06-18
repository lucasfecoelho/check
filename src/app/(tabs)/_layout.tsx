import { Tabs } from 'expo-router';
import {
  BarChart3,
  CalendarDays,
  CircleUser,
  Home,
  ListTodo,
  LucideIcon,
  NotebookPen,
  Repeat2,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { useThemeColors } from '@/theme';

export default function TabsLayout() {
  const colors = useThemeColors();

  function getTabColor(focused: boolean, activeColor: string) {
    return focused ? activeColor : colors.textSoft;
  }

  function renderTabIcon(Icon: LucideIcon, focused: boolean, activeColor: string) {
    return (
      <View
        style={[
          styles.iconShell,
          {
            backgroundColor: focused ? colors.primarySoft : 'transparent',
            borderColor: focused ? colors.border : 'transparent',
          },
        ]}>
        <Icon color={getTabColor(focused, activeColor)} size={21} strokeWidth={2.25} />
      </View>
    );
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
          borderTopWidth: 0,
          elevation: 12,
          height: 66,
          paddingBottom: 8,
          paddingTop: 8,
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.06,
          shadowRadius: 18,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => renderTabIcon(Home, focused, colors.primary),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ focused }) => renderTabIcon(ListTodo, focused, colors.task),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habitos',
          tabBarIcon: ({ focused }) => renderTabIcon(Repeat2, focused, colors.habit),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ focused }) => renderTabIcon(CalendarDays, focused, colors.primary),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Estatisticas',
          tabBarIcon: ({ focused }) => renderTabIcon(BarChart3, focused, colors.primary),
        }}
      />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'Caderno',
          tabBarIcon: ({ focused }) => renderTabIcon(NotebookPen, focused, colors.primary),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => renderTabIcon(CircleUser, focused, colors.settings),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconShell: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
});
