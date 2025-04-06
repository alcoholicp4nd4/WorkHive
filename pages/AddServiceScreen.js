import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, Alert,
  ActivityIndicator, TouchableOpacity, Image, ScrollView, Dimensions, Platform
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

export default function AddServiceScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [serviceType, setServiceType] = useState('remote');
  const [priceType, setPriceType] = useState('flat');
  const [price, setPrice] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [images, setImages] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([
    // Tech
    { label: 'Web Development', value: 'web-development' },
    { label: 'Mobile App Development', value: 'mobile-app-development' },
    { label: 'Software Engineering', value: 'software-engineering' },
    { label: 'UI/UX Design', value: 'ui-ux-design' },
    { label: 'QA Testing', value: 'qa-testing' },
    { label: 'Game Development', value: 'game-development' },
    { label: 'DevOps & Cloud', value: 'devops-cloud' },

    // Design
    { label: 'Graphic Design', value: 'graphic-design' },
    { label: 'Logo Design', value: 'logo-design' },
    { label: 'Animation', value: 'animation' },
    { label: 'Video Editing', value: 'video-editing' },
    { label: 'Photography', value: 'photography' },
    { label: 'Branding & Identity', value: 'branding' },
    { label: 'Illustration', value: 'illustration' },

    // Business
    { label: 'SEO Optimization', value: 'seo' },
    { label: 'Digital Marketing', value: 'digital-marketing' },
    { label: 'Social Media Management', value: 'social-media' },
    { label: 'Email Marketing', value: 'email-marketing' },
    { label: 'Copywriting', value: 'copywriting' },
    { label: 'Business Consulting', value: 'business-consulting' },
    { label: 'Sales Strategy', value: 'sales-strategy' },

    // Local
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical Work', value: 'electrical' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Moving Services', value: 'moving' },
    { label: 'Handyman Services', value: 'handyman' },
    { label: 'Pest Control', value: 'pest-control' },
    { label: 'Landscaping', value: 'landscaping' },

    // Education
    { label: 'Tutoring', value: 'tutoring' },
    { label: 'Language Teaching', value: 'language-teaching' },
    { label: 'Life Coaching', value: 'life-coaching' },
    { label: 'Career Coaching', value: 'career-coaching' },
    { label: 'Test Preparation', value: 'test-prep' },

    // Wellness
    { label: 'Fitness Training', value: 'fitness-training' },
    { label: 'Yoga Instruction', value: 'yoga' },
    { label: 'Therapy & Counseling', value: 'therapy' },
    { label: 'Nutrition Planning', value: 'nutrition' },
    { label: 'Beauty & Skincare', value: 'beauty' },
    { label: 'Hair Styling', value: 'hair-styling' },

    // Other
    { label: 'Event Planning', value: 'event-planning' },
    { label: 'Virtual Assistance', value: 'virtual-assistance' },
    { label: 'Data Entry', value: 'data-entry' },
    { label: 'Translation Services', value: 'translation' },
    { label: 'Custom Orders', value: 'custom-orders' },
  ]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUsername(user.username);
        if (!user.isProvider) {
          Alert.alert("Access Denied", "Only service providers can add services.");
        }
      }
    };
    fetchUser();
  }, []);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      allowsMultipleSelection: true,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !description || !category || !price || !deliveryTime) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }

    setLoading(true);
    try {
      const serviceData = {
        title,
        description,
        category,
        serviceType,
        priceType,
        price: parseFloat(price),
        deliveryTime,
        images,
        username,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'services'), serviceData);

      Alert.alert('Success', 'Service added successfully!');
      setTitle('');
      setDescription('');
      setCategory(null);
      setServiceType('remote');
      setPriceType('flat');
      setPrice('');
      setDeliveryTime('');
      setImages([]);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong while adding the service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.formWrapper}>
        <Text style={styles.heading}>Add New Service</Text>

        <TextInput
          style={styles.input}
          placeholder="Service Title"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="Service Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text style={styles.label}>Category</Text>
        <DropDownPicker
          open={open}
          value={category}
          items={categories}
          setOpen={setOpen}
          setValue={setCategory}
          setItems={setCategories}
          placeholder="Select a category"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
        />

        <Text style={styles.label}>Service Type</Text>
        <View style={styles.row}>
          {['remote', 'in-person'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setServiceType(type)}>
              <Text style={[styles.radio, serviceType === type && styles.radioSelected]}>
                {type === 'remote' ? 'Remote' : 'In-Person'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Pricing</Text>
        <View style={styles.row}>
          {['flat', 'hourly'].map((type) => (
            <TouchableOpacity key={type} onPress={() => setPriceType(type)}>
              <Text style={[styles.radio, priceType === type && styles.radioSelected]}>
                {type === 'flat' ? 'Flat Rate' : 'Hourly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Enter price (e.g. 50)"
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <TextInput
          style={styles.input}
          placeholder="Estimated delivery time (e.g. 3 days)"
          value={deliveryTime}
          onChangeText={setDeliveryTime}
        />

        <TouchableOpacity style={styles.imageButton} onPress={pickImages}>
          <Text style={styles.imageButtonText}>Add Images (Max 5)</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {images.map((uri, index) => (
              <View key={index} style={styles.imageThumb}>
                <Image source={{ uri }} style={styles.image} />
                <TouchableOpacity onPress={() => handleRemoveImage(index)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.buttonContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#B78BFA" />
          ) : (
            <Button title="Submit" onPress={handleSubmit} color="#B78BFA" />
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: isWeb ? 40 : 20,
    backgroundColor: '#f0f2f5',
    flexGrow: 1,
    alignItems: 'center',
  },
  formWrapper: {
    width: '100%',
    maxWidth: isWeb ? 700 : '100%',
  },
  heading: {
    fontSize: isWeb ? 28 : 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: isWeb ? 18 : 16,
  },
  label: {
    fontSize: isWeb ? 18 : 16,
    marginBottom: 6,
    color: '#444',
  },
  dropdown: {
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 15,
  },
  dropdownContainer: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  radio: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    marginRight: 10,
    color: '#555',
  },
  radioSelected: {
    backgroundColor: '#B78BFA',
    color: '#fff',
    borderColor: '#B78BFA',
  },
  imageButton: {
    backgroundColor: '#E3D1FF',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  imageButtonText: {
    color: '#6C2ED9',
    fontWeight: '600',
  },
  imageScroll: {
    marginVertical: 10,
  },
  imageThumb: {
    position: 'relative',
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  removeText: {
    color: 'red',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: 8,
  },
});
