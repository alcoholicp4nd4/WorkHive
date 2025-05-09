import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
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
  PlusCircle,
  ChevronRight,
} from 'lucide-react-native';

const menuItems = [
  { icon: Calendar, label: 'My Bookings', screen: 'MyBooking' },
  { icon: Briefcase, label: 'Provider Bookings', screen: 'BookedServices' },
];

export default function AccountScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchUserData = async () => {
      const currentUserData = await getCurrentUser();
      if (currentUserData) {
        setUser(currentUserData);
        setProfileImage(currentUserData.profileImage || null);
      } else {
        navigation.replace('Login');
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    if (!user || imageUploadLoading) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'You need to allow access to photos to change the profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUploadLoading(true);
      try {
        const imageUrl = await uploadProfileImage(result.assets[0].uri, user.uid);
        if (imageUrl) {
          setProfileImage(imageUrl);
          await updateUserProfileImage(user.uid, imageUrl);

          setUser(prev => ({...prev, profileImage: imageUrl}));
          
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          throw new Error('Upload failed to return URL');
        }
      } catch (error) {
        console.error("Image Upload Error:", error);
        Alert.alert('Error', 'Failed to update profile picture. Please try again.');
      } finally {
        setImageUploadLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error("Logout Error:", error);
      Alert.alert("Logout Failed", "An error occurred during logout.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </SafeAreaView>
    );
  }
  
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Could not load user data.</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Return to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4EBFF" translucent={false} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={pickImage} disabled={imageUploadLoading} style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileImage || 'https://placehold.co/100' }}
              style={styles.profileImage}
            />
            {imageUploadLoading && <ActivityIndicator size="small" color="#FFFFFF" style={styles.imageLoadingIndicator}/>}
          </TouchableOpacity>
          <Text style={styles.userName}>{user.username}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => navigation.navigate('UserProfileScreen')}
          >
            <User size={18} color="#FFFFFF" style={styles.buttonIcon}/>
            <Text style={styles.outlineButtonText}>View Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineButton}
            onPress={() => navigation.navigate('AddServiceScreen')}
          >
            <PlusCircle size={18} color="#FFFFFF" style={styles.buttonIcon}/>
            <Text style={styles.outlineButtonText}>Add Service</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItemCard}
              onPress={() => item.screen ? navigation.navigate(item.screen) : Alert.alert('Coming Soon', `${item.label} feature is not yet available.`)}
            >
              <item.icon size={22} color="#5A31F4" />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={20} color="#A0AEC0" style={styles.menuChevron} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4EBFF',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 30,
    backgroundColor: '#F4EBFF',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  imageLoadingIndicator: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 50,
  },
  userName: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D1B5A',
  },
  email: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 25,
    gap: 15,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B78BFA',
    borderWidth: 1.5,
    borderColor: '#B78BFA',
    paddingVertical: 14,
    borderRadius: 10,
  },
  outlineButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
    color: '#FFFFFF',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 35,
    marginBottom: 25,
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3.00,
    elevation: 2,
  },
  menuLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2D1B5A',
    fontWeight: '500',
  },
  menuChevron: {
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
    marginHorizontal: 20,
    marginBottom: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#DC2626',
    marginLeft: 8,
    fontWeight: '600',
  },
});
