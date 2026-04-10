import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from './src/lib/theme';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ActivityScreen from './src/screens/ActivityScreen';
import MetricsScreen from './src/screens/MetricsScreen';
import ChatScreen from './src/screens/ChatScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('crm_token')
      .then((token) => setIsLoggedIn(!!token))
      .catch(() => setIsLoggedIn(false));
  }, []);

  if (isLoggedIn === null) return null;

  if (!isLoggedIn) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen onLogin={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: colors.cream,
              borderTopColor: colors.oat.DEFAULT,
              borderTopWidth: 1,
              paddingTop: 8,
              height: 88,
            },
            tabBarActiveTintColor: colors.black,
            tabBarInactiveTintColor: colors.warm.silver,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '500',
              marginTop: 4,
            },
            headerStyle: {
              backgroundColor: colors.cream,
              borderBottomColor: colors.oat.DEFAULT,
              borderBottomWidth: 1,
            },
            headerTitleStyle: {
              fontWeight: '600',
              fontSize: 18,
              color: colors.black,
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Inicio',
              tabBarIcon: ({ color }) => <TabIcon emoji="📊" />,
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Activity"
            component={ActivityScreen}
            options={{
              title: 'Actividad',
              tabBarIcon: ({ color }) => <TabIcon emoji="⚡" />,
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Metrics"
            component={MetricsScreen}
            options={{
              title: 'Metricas',
              tabBarIcon: ({ color }) => <TabIcon emoji="📈" />,
              headerShown: false,
            }}
          />
          <Tab.Screen
            name="Chat"
            component={ChatScreen}
            options={{
              title: 'Chat IA',
              tabBarIcon: ({ color }) => <TabIcon emoji="🤖" />,
              headerShown: false,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

function TabIcon({ emoji }: { emoji: string }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}
