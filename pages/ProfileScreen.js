import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Settings, Bell, CreditCard, Shield, CircleHelp as HelpCircle, LogOut, Camera } from 'lucide-react-native';

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
  const [profileImage, setProfileImage] = useState(null); // Store profile image

  // Load user data & profile image from AsyncStorage
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('loggedInUser');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);

          // ✅ Load the saved profile image for this user
          const savedProfileImage = await AsyncStorage.getItem(`profileImage_${parsedUser.username}`);
          if (savedProfileImage) {
            setProfileImage(savedProfileImage);
          }
        }
      } catch (error) {
        console.error("❌ Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  // Function to pick an image
  const pickImage = async () => {
    if (!user) return; // Ensure user is loaded before proceeding

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "You need to allow access to photos to change profile picture.");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
      await AsyncStorage.setItem(`profileImage_${user.username}`, result.assets[0].uri); // ✅ Save per user
    }
  };

  // Function to logout
  const handleLogout = async () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          onPress: async () => {
            await AsyncStorage.removeItem('loggedInUser'); // ✅ Clear session, but keep profile images
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {/* ✅ Profile Picture */}
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400' }}
            style={styles.profileImage}
          />
          <View style={styles.cameraIcon}>
            <Camera size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* ✅ Show logged-in user's name & email */}
        <Text style={styles.name}>{user ? user.username : "Loading..."}</Text>
        <Text style={styles.email}>{user ? user.email : "Loading..."}</Text>
      </View>

      {/* ✅ Restored Menu Buttons */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <item.icon size={24} color="#333" />
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}

        {/* ✅ Log Out Button */}
        <TouchableOpacity style={[styles.menuItem, styles.logoutButton]} onPress={handleLogout}>
          <LogOut size={24} color="#D9534F" />
          <Text style={[styles.menuLabel, { color: '#D9534F' }]}>Log Out</Text>
        </TouchableOpacity>
      </View>
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
