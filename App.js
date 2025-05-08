import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import * as Linking from "expo-linking";
import { getCurrentUser } from "./database/authDatabase";
import { auth } from "./database/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import HomeScreen from "./pages/HomeScreen";
import FavoriteScreen from "./pages/FavoriteScreen";
import SearchScreen from "./pages/SearchScreen";
import AccountScreen from "./pages/AccountScreen";
import AddServiceScreen from "./pages/AddServiceScreen";
import ServiceDetailsScreen from "./pages/ServiceDetailsScreen";
import ChatScreen from "./pages/ChatScreen";
import ChatsScreen from "./pages/chats";
import AdminDashboard from "./pages/AdminDashboard";
import MyBookingsScreen from "./pages/MyBookingsScreen";
import ProviderBookingsScreen from "./pages/ProviderBookingsScreen";
import BookingDetailsScreen from "./pages/BookingDetailsScreen";
import ReportForm from "./pages/ReportForm";
import ProfileSetupScreen from "./pages/ProfileSetupScreen";
import UserProfileScreen from "./pages/UserProfileScreen";
import EditProfileScreen from "./pages/EditProfileScreen";
import PublicProfileScreen from "./pages/PublicProfileScreen";
import CategoryScreen from "./pages/CategoryScreen";
import { Home as HomeIcon, Heart, Search as SearchIcon, User, MessageCircle } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// ✅ Web Deep Linking Setup
const linking = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      MainApp: {
        screens: {
          Home: "home",
          Favorite: "favorite",
          Search: "search",
          Profile: "profile",
          AddService: "addService",
        },
      },
    },
  },
};

function MainAppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen 
        name="Favorite" 
        component={FavoriteScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <SearchIcon color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen 
        name="Account" 
        component={AccountScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size || 24} />,
        }}
      />
      <Tab.Screen 
        name="Chats" 
        component={ChatsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size || 24} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = await getCurrentUser();
        setUser(userData);
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          height: Platform.OS === "web" ? "100vh" : "100%",
        }}
      >
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Initializing App...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? "MainApp" : "Login"}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ProfileSetupScreen" component={ProfileSetupScreen} />
        <Stack.Screen name="MainApp" component={MainAppTabs} />
        <Stack.Screen name="AddServiceScreen" component={AddServiceScreen} />
        <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Chats" component={ChatsScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        <Stack.Screen name="UserProfileScreen" component={UserProfileScreen} />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
        <Stack.Screen name="MyBooking" component={MyBookingsScreen} />
        <Stack.Screen name="PublicProfileScreen" component={PublicProfileScreen} />
        <Stack.Screen name="BookedServices" component={ProviderBookingsScreen} />
        <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        <Stack.Screen name="ReportForm" component={ReportForm} />
        <Stack.Screen name="Category" component={CategoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
