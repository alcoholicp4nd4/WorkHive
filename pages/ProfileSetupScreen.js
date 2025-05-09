import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import {
  getCurrentUser,
  uploadProfileImage,
  uploadDocument,
  updateUserProfile,
} from '../database/authDatabase';
import { MaterialIcons } from '@expo/vector-icons';

export default function ProfileSetupScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [uploads, setUploads] = useState([]); // { name, uri }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      if (!u) navigation.replace('Login');
      else setUser(u);
    })();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Photo access is required.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) setProfileImageUri(res.assets[0].uri);
  };

  const pickDocument = async () => {
    if (loading) return;
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!res.canceled && res.assets?.length > 0) {
      const asset = res.assets[0];
      setUploads((prev) => [...prev, { name: asset.name, uri: asset.uri }]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) return Alert.alert('Full name is required.');
    setLoading(true);
    try {
      let profileUrl = null;
      if (profileImageUri) {
        profileUrl = await uploadProfileImage(profileImageUri, user.uid);
        if (!profileUrl) throw new Error('Profile image upload failed');
      }

      const uploadedDocs = [];
      for (let { name, uri } of uploads) {
        let uploadUri = uri;
        if (Platform.OS === 'android' && uri.startsWith('content://')) {
          const dest = `${FileSystem.cacheDirectory}${name}`;
          await FileSystem.copyAsync({ from: uri, to: dest });
          uploadUri = dest;
        }
        const url = await uploadDocument(uploadUri, user.uid, name);
        if (url) uploadedDocs.push({ name, url });
      }

      const payload = {
        fullName,
        bio,
        phone,
        profileImage: profileUrl || '',
        documents: uploadedDocs,
      };

      const success = await updateUserProfile(user.uid, payload);
      if (!success) throw new Error('Failed to update profile');
      Alert.alert('✅ Success', 'Profile setup complete!');
      navigation.replace('MainApp');
    } catch (err) {
      console.error('🚨 Profile Setup Error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.safeArea}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Header Bar */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color="#5A31F4" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile Setup</Text>
          </View>

          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={loading}>
            <Image
              source={
                profileImageUri
                  ? { uri: profileImageUri }
                  : require('../assets/Avatar_placeholder.png')
              }
              style={styles.avatar}
            />
            <Text style={styles.avatarText}>Tap to change photo</Text>
          </TouchableOpacity>

          {/* Card for Inputs */}
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Jane Doe"
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor="#aaa"
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="e.g. +1 555 1234"
                placeholderTextColor="#aaa"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Documents Section */}
          <Text style={styles.subheading}>Documents / Certificates</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.outlineButton} onPress={pickDocument} disabled={loading}>
              <Text style={styles.outlineButtonText}>Add File</Text>
            </TouchableOpacity>
            {uploads.length > 0 ? uploads.map((doc, i) => (
              <View key={i} style={styles.docItem}>
                <Text style={styles.docText}>{doc.name}</Text>
              </View>
            )) : <Text style={styles.noText}>No documents uploaded</Text>}
          </View>

          {loading ? (
            <ActivityIndicator color="#B78BFA" size="large" style={{ marginTop: 30 }} />
          ) : (
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Profile</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
  },
  container: {
    padding: 20,
    backgroundColor: '#F4EBFF',
    paddingBottom: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#AAA',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    color: '#4B5563',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#2D1B5A',
    marginTop: 8,
    marginLeft: 2,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#B78BFA',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: '#B78BFA',
    fontSize: 16,
    fontWeight: '600',
  },
  docItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docText: {
    color: '#374151',
    fontSize: 15,
    marginBottom: 2,
  },
  noText: {
    color: '#6B7280',
    marginBottom: 12,
    fontSize: 15,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#B78BFA',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 50,
    alignSelf: 'center',
    width: '100%',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
