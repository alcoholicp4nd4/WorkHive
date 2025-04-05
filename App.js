import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { getCurrentUser } from './database/authDatabase';

import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import HomeScreen from './pages/HomeScreen';
import FavoriteScreen from './pages/FavoriteScreen';
import SearchScreen from './pages/SearchScreen';
import ProfileScreen from './pages/ProfileScreen';
import AddServiceScreen from './pages/AddServiceScreen'; 
import ServiceDetailsScreen from './pages/ServiceDetailsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ✅ Web Deep Linking Setup
const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      MainApp: {
        screens: {
          Home: 'home',
          Favorite: 'favorite',
          Search: 'search',
          Profile: 'profile',
          AddService: 'addService', 
        },
      },
    },
  },
};

function MainAppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Favorite" component={FavoriteScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        await getCurrentUser();
      } catch (err) {
        console.error("⚠️ Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', height: Platform.OS === 'web' ? '100vh' : '100%' }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Initializing App...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainApp" component={MainAppTabs} />
        <Stack.Screen name="AddServiceScreen" component={AddServiceScreen} /> 
        <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
}
