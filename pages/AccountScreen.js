import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
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
  User,
  Calendar,
  Briefcase,
} from 'lucide-react-native';

const menuItems = [
  { icon: Calendar, label: 'My Bookings', screen: 'MyBooking' },
  { icon: Briefcase, label: 'Provider Bookings', screen: 'BookedServices' },
  { icon: Settings, label: 'Settings' },
  { icon: Bell, label: 'Notifications' },
  { icon: CreditCard, label: 'Payment Methods' },
  { icon: Shield, label: 'Privacy & Security' },
  { icon: HelpCircle, label: 'Help & Support' },
];

export default function AccountScreen() {
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

    const result = await ImagePicker.launchImageLibraryAsync({
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

  const handleLogout = async () => {
    await logoutUser();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with profile info */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} disabled={loading} style={{ position: 'relative' }}>
          <Image
            source={{ uri: profileImage || 'https://placehold.co/100' }}
            style={styles.profileImage}
          />
          <View style={styles.cameraIcon}>
            <Camera size={20} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>{user ? user.username : 'Loading...'}</Text>
        <Text style={styles.email}>{user ? user.email : 'Loading...'}</Text>
        {loading && <Text style={styles.uploadingText}>Uploading...</Text>}
      </View>

      {/* View Profile */}
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => navigation.navigate('UserProfileScreen')}
      >
        <User size={20} color="#fff" />
        <Text style={styles.editProfileText}>View Profile</Text>
      </TouchableOpacity>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.menuItem}
            onPress={() => item.screen ? navigation.navigate(item.screen) : null}
          >
            <item.icon size={20} color="#4F4F4F" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Service Button */}
      <TouchableOpacity
        style={styles.addServiceButton}
        onPress={() => navigation.navigate('AddServiceScreen')}
      >
        <Text style={styles.addServiceButtonText}>Add Service</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2ECFA', // Soft pastel background
  },
  header: {
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 40,
    backgroundColor: '#B78BFA', // Pastel purple header
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 30,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00000099',
    borderRadius: 50,
    padding: 3,
  },
  userName: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  uploadingText: {
    marginTop: 5,
    color: '#fff',
    fontSize: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#6C2ED9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
    marginTop: -15, // Slight overlap below header
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE3B7', // Lighter peach color
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
  },
  menuLabel: {
    marginLeft: 10,
    fontSize: 15,
    color: '#4F4F4F',
    fontWeight: '600',
  },
  addServiceButton: {
    backgroundColor: '#E6D1FF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addServiceButtonText: {
    fontSize: 15,
    color: '#4E2E8C',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#CF4C4C',
    marginHorizontal: 20,
    marginBottom: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  logoutButtonText: {
    fontSize: 15,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
});
