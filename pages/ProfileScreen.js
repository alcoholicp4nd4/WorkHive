import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation, useFocusEffect  } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  uploadProfileImage,
  getCurrentUser,
  logoutUser,
  updateUserProfileImage,
  updateUserToProvider,
} from '../database/authDatabase';
import * as ImagePicker from 'expo-image-picker';
import {
  Settings,
  Bell,
  CreditCard,
  Shield,
  CircleHelp as HelpCircle,
  LogOut,
  Camera,
} from 'lucide-react-native';

const menuItems = [
  { icon: Settings, label: 'Settings' },
  { icon: Bell, label: 'Notifications' },
  { icon: CreditCard, label: 'Payment Methods' },
  { icon: Shield, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help & Support' },
];

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setProfileImage(currentUser.profileImage || null);
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to allow access to photos to change the profile picture.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['image'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setLoading(true);
      const imageUrl = await uploadProfileImage(result.assets[0].uri, user.uid);
      if (imageUrl) {
        setProfileImage(imageUrl);
        await updateUserProfileImage(user.uid, imageUrl);

        if (Platform.OS === 'web') {
          localStorage.setItem(`profileImage_${user.username}`, imageUrl);
        } else {
          await AsyncStorage.setItem(`profileImage_${user.username}`, imageUrl);
        }

        Alert.alert('Success', 'Profile picture updated!');
      } else {
        Alert.alert('Error', 'Failed to update profile picture.');
      }
      setLoading(false);
    }
  };

  const handleBecomeProvider = async () => {
    if (!user) return;

    try {
      await updateUserToProvider(user.uid);

      const updatedUser = { ...user, isProvider: true };
      if (Platform.OS === 'web') {
        localStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      } else {
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(updatedUser));
      }

      setUser(updatedUser);
      Alert.alert('Success', "You're now a provider!");
    } catch (err) {
      Alert.alert('Error', 'Failed to become a provider.');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} disabled={loading}>
          <Image source={{ uri: profileImage || 'https://placehold.co/100' }} style={styles.profileImage} />
          <View style={styles.cameraIcon}>
            <Camera size={24} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user ? user.username : 'Loading...'}</Text>
        <Text style={styles.email}>{user ? user.email : 'Loading...'}</Text>
      </View>

      {loading && <Text style={{ color: 'white' }}>Uploading...</Text>}

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <item.icon size={24} color="#333" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {user?.isProvider && (
  <TouchableOpacity
    style={styles.analyticsButton}
    onPress={() => navigation.navigate('Analytics')}
  >
    <Text style={styles.analyticsText}>View Analytics</Text>
  </TouchableOpacity>
)}

      {/* Navigate to Add Service Screen */}
      <TouchableOpacity
        style={[styles.menuItem, { backgroundColor: '#A9D1F7' }]}
        onPress={() => navigation.navigate('AddServiceScreen')}>
        <Text style={styles.menuLabel}>Add Service</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
        <LogOut size={24} color="#D9534F" />
        <Text style={[styles.menuLabel, { color: '#D9534F' }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#CB9DF0' },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  analyticsButton: {
    backgroundColor: '#B78BFA',
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  analyticsText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },  
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00000080',
    borderRadius: 20,
    padding: 5,
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  email: { fontSize: 16, color: '#fff', marginTop: 5 },
  menuContainer: { padding: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDDBBB',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  menuLabel: { marginLeft: 15, fontSize: 16, color: '#333' },
  logoutButton: { backgroundColor: '#FFE5E5' },
});