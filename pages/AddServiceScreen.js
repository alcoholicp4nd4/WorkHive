import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import Slider from '@react-native-community/slider';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getCurrentUser } from '../database/authDatabase';
import { ArrowLeft, MapPin, ImagePlus, Check, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const screenWidth = Dimensions.get('window').width;
const isWeb = Platform.OS === 'web';

export default function AddServiceScreen() {
  // Basic service fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [serviceType, setServiceType] = useState('remote');
  const [priceType, setPriceType] = useState('flat');
  const [price, setPrice] = useState('');
  // Delivery time is now split into a numeric value and a unit.
  const [deliveryTimeValue, setDeliveryTimeValue] = useState('');
  const [deliveryTimeUnit, setDeliveryTimeUnit] = useState('days'); // default unit

  const [images, setImages] = useState([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  // DropDownPicker state for categories
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([
    { label: '--Tech--', value: 'tech-label', disabled: true },
    { label: 'Web Development', value: 'web-development' },
    { label: 'Mobile App Development', value: 'mobile-app-development' },
    { label: 'Software Engineering', value: 'software-engineering' },
    { label: 'UI/UX Design', value: 'ui-ux-design' },
    { label: 'QA Testing', value: 'qa-testing' },
    { label: 'Game Development', value: 'game-development' },
    { label: 'DevOps & Cloud', value: 'devops-cloud' },
  
    { label: '--Design--', value: 'design-label', disabled: true },
    { label: 'Graphic Design', value: 'graphic-design' },
    { label: 'Logo Design', value: 'logo-design' },
    { label: 'Animation', value: 'animation' },
    { label: 'Video Editing', value: 'video-editing' },
    { label: 'Photography', value: 'photography' },
    { label: 'Branding & Identity', value: 'branding' },
    { label: 'Illustration', value: 'illustration' },
  
    { label: '--Business--', value: 'business-label', disabled: true },
    { label: 'SEO Optimization', value: 'seo' },
    { label: 'Digital Marketing', value: 'digital-marketing' },
    { label: 'Social Media Management', value: 'social-media' },
    { label: 'Email Marketing', value: 'email-marketing' },
    { label: 'Copywriting', value: 'copywriting' },
    { label: 'Business Consulting', value: 'business-consulting' },
    { label: 'Sales Strategy', value: 'sales-strategy' },
  
    { label: '--Local--', value: 'local-label', disabled: true },
    { label: 'Plumbing', value: 'plumbing' },
    { label: 'Electrical Work', value: 'electrical' },
    { label: 'Cleaning', value: 'cleaning' },
    { label: 'Moving Services', value: 'moving' },
    { label: 'Handyman Services', value: 'handyman' },
    { label: 'Pest Control', value: 'pest-control' },
    { label: 'Landscaping', value: 'landscaping' },
  
    { label: '--Education--', value: 'education-label', disabled: true },
    { label: 'Tutoring', value: 'tutoring' },
    { label: 'Language Teaching', value: 'language-teaching' },
    { label: 'Life Coaching', value: 'life-coaching' },
    { label: 'Career Coaching', value: 'career-coaching' },
    { label: 'Test Preparation', value: 'test-prep' },
  
    { label: '--Wellness--', value: 'wellness-label', disabled: true },
    { label: 'Fitness Training', value: 'fitness-training' },
    { label: 'Yoga Instruction', value: 'yoga' },
    { label: 'Therapy & Counseling', value: 'therapy' },
    { label: 'Nutrition Planning', value: 'nutrition' },
    { label: 'Beauty & Skincare', value: 'beauty' },
    { label: 'Hair Styling', value: 'hair-styling' },
  
    { label: '--Other--', value: 'other-label', disabled: true },
    { label: 'Event Planning', value: 'event-planning' },
    { label: 'Virtual Assistance', value: 'virtual-assistance' },
    { label: 'Data Entry', value: 'data-entry' },
    { label: 'Translation Services', value: 'translation' },
    { label: 'Custom Orders', value: 'custom-orders' },
  ]);

  // Location & radius state for service availability
  const [locationService, setLocationService] = useState(null);
  const [radiusService, setRadiusService] = useState(5);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [mapRegion, setMapRegion] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUsername(user.username);
      } else {
        navigation.replace('Login');
      }
    };
    fetchUser();
  }, []);

  // Image picker and upload functions remain the same
  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      allowsEditing: true,
      quality: 0.5,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const newImages = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...newImages].slice(0, 5));
    }
  };

  const uploadImages = async () => {
    const uploadedURLs = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      const formData = new FormData();
      formData.append('key', '590d8c2489661a30ea77153c3d94cb7e'); // Replace with your API key
      formData.append('image', base64);
      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        uploadedURLs.push(json.data.url);
      } else {
        console.warn('Upload failed:', json);
      }
    }
    return uploadedURLs;
  };

  // Helper to get current location for the map modal
  const handleGetCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Permission to access location was denied.");
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setMapRegion(region);
    setLocationService({ latitude: region.latitude, longitude: region.longitude });
  };

  // Validate that price is a valid number and delivery time is an integer.
  // Construct a combined deliveryTime string with unit.
  const handleSubmit = async () => {
    if (!title || !description || !category || !price || !deliveryTimeValue) {
      Alert.alert('Missing Fields', 'Please fill out all required fields.');
      return;
    }
    // Validate price: must be a valid number.
    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber)) {
      Alert.alert('Invalid Price', 'Please enter a valid number for the price.');
      return;
    }
    // Validate delivery time value: must be an integer.
    const deliveryInt = parseInt(deliveryTimeValue, 10);
    if (isNaN(deliveryInt) || deliveryInt.toString() !== deliveryTimeValue.trim()) {
      Alert.alert('Invalid Delivery Time', 'Please enter a valid integer for the delivery time.');
      return;
    }
    // Combine delivery time with unit.
    const deliveryTimeCombined = `${deliveryInt} ${deliveryTimeUnit}`;

    setLoading(true);
    try {
      const imageUrls = await uploadImages();
      const user = await getCurrentUser();
      if (!user) throw new Error('User not authenticated.');
      
      const serviceData = {
        title,
        description,
        category,
        serviceType,
        priceType,
        price: priceNumber,
        deliveryTime: deliveryTimeCombined,
        images: imageUrls,
        username,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };
      if (locationService) {
        serviceData.location = locationService;
      }
      if (radiusService) {
        serviceData.radius = radiusService;
      }
      await addDoc(collection(db, 'services'), serviceData);
      Alert.alert('Success', 'Service added successfully!');
      // Reset all fields
      setTitle('');
      setDescription('');
      setCategory(null);
      setServiceType('remote');
      setPriceType('flat');
      setPrice('');
      setDeliveryTimeValue('');
      setDeliveryTimeUnit('days');
      setImages([]);
      setLocationService(null);
      setRadiusService(5);
      setMapRegion(null);
      navigation.goBack();
    } catch (error) {
      console.error('Error submitting service:', error);
      Alert.alert('Error', error.message || 'Something went wrong while adding the service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#2D1B5A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Service</Text>
      </View>

      <ScrollView nestedScrollEnabled={true} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formPadding}>
          <Text style={styles.label}>Service Title</Text>
          <TextInput style={styles.input} placeholder="e.g., Professional Logo Design" value={title} onChangeText={setTitle} placeholderTextColor="#A0AEC0" />
          
          <Text style={styles.label}>Service Description</Text>
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe your service in detail..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#A0AEC0" />
          
          <Text style={styles.label}>Category</Text>
          <View style={{ zIndex: 3000, marginBottom: 20 }}>
            <DropDownPicker
              open={open}
              value={category}
              items={categories}
              setOpen={setOpen}
              setValue={setCategory}
              setItems={setCategories}
              placeholder="Select a category"
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              dropDownContainerStyle={styles.dropdownContainer}
              listItemLabelStyle={styles.dropdownItemLabel}
              selectedItemLabelStyle={styles.dropdownSelectedItemLabel}
              searchable={true}
              searchPlaceholder="Search categories..."
              listMode="MODAL"
              modalProps={{ animationType: 'slide' }}
              modalTitle="Select Category"
              theme="LIGHT"
              zIndex={3000}
              zIndexInverse={1000}
            />
          </View>

          <Text style={styles.label}>Service Type</Text>
          <View style={styles.radioGroup}>
            {['remote', 'in-person'].map((type) => (
              <TouchableOpacity 
                key={type} 
                style={[styles.radioButton, serviceType === type && styles.radioButtonSelected]}
                onPress={() => setServiceType(type)}
              >
                <Text style={[styles.radioText, serviceType === type && styles.radioTextSelected]}>
                  {type === 'remote' ? 'Remote' : 'In-Person'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Pricing Type</Text>
          <View style={styles.radioGroup}>
            {['flat', 'hourly'].map((type) => (
              <TouchableOpacity 
                key={type} 
                style={[styles.radioButton, priceType === type && styles.radioButtonSelected]}
                onPress={() => setPriceType(type)}
              >
                <Text style={[styles.radioText, priceType === type && styles.radioTextSelected]}>
                  {type === 'flat' ? 'Flat Rate' : 'Hourly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Price (in TND)</Text>
          <TextInput style={styles.input} placeholder="e.g. 150" value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor="#A0AEC0" />

          <Text style={styles.label}>Estimated Delivery Time</Text>
          <View style={styles.deliveryRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 10 }]}
              placeholder="e.g. 3"
              value={deliveryTimeValue}
              onChangeText={setDeliveryTimeValue}
              keyboardType="numeric"
              placeholderTextColor="#A0AEC0"
            />
            <View style={styles.unitSelector}>
              {['days', 'months'].map(unit => (
                 <TouchableOpacity
                    key={unit}
                    style={[styles.unitOption, deliveryTimeUnit === unit && styles.unitOptionSelected]}
                    onPress={() => setDeliveryTimeUnit(unit)}
                  >
                    <Text style={[styles.unitOptionText, deliveryTimeUnit === unit && styles.unitOptionTextSelected]}>
                      {unit.charAt(0).toUpperCase() + unit.slice(1)} 
                    </Text>
                  </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>Service Location (Optional)</Text>
           <TouchableOpacity
            style={styles.secondaryButton} 
            onPress={() => setLocationModalVisible(true)}
          >
            <MapPin size={18} color="#5A31F4" style={{marginRight: 8}}/>
            <Text style={styles.secondaryButtonText}>Set Location & Radius</Text>
          </TouchableOpacity>
          {locationService && (
            <Text style={styles.infoText}>
              Location Set: {locationService.latitude.toFixed(4)}, {locationService.longitude.toFixed(4)} (Radius: {radiusService} km)
            </Text>
          )}

          <Text style={styles.label}>Service Images (Optional, Max 5)</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={pickImages}>
            <ImagePlus size={18} color="#5A31F4" style={{marginRight: 8}}/>
            <Text style={styles.secondaryButtonText}>Add Images</Text>
          </TouchableOpacity>
          
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewContainer}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageThumbContainer}>
                  <Image source={{ uri }} style={styles.imagePreview} />
                  <TouchableOpacity 
                    onPress={() => setImages(prev => prev.filter((_, i) => i !== index))} 
                    style={styles.removeImageButton}
                   >
                    <Trash2 size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.submitButtonContainer}>
            <TouchableOpacity 
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#5A31F4" />
              ) : (
                <>
                  <Check size={20} color="#5A31F4" style={{marginRight: 8}}/>
                  <Text style={styles.primaryButtonText}>Add Service</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={locationModalVisible}
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={styles.locationModalContainer}>
          <View style={styles.locationModal}>
            <Text style={styles.locationModalTitle}>Set Location & Radius</Text>
            {!mapRegion ? (
              <TouchableOpacity style={styles.modalButton} onPress={handleGetCurrentLocation}>
                <Text style={styles.modalButtonText}>Get Current Location</Text>
              </TouchableOpacity>
            ) : (
              <MapView
                style={styles.map}
                region={mapRegion}
                onRegionChangeComplete={(region) => {
                  setMapRegion(region);
                  setLocationService({ latitude: region.latitude, longitude: region.longitude });
                }}
              >
                <Marker
                  coordinate={mapRegion}
                  draggable
                  onDragEnd={(e) => {
                    const newCoord = e.nativeEvent.coordinate;
                    setLocationService(newCoord);
                    setMapRegion({ ...mapRegion, latitude: newCoord.latitude, longitude: newCoord.longitude });
                  }}
                />
                <Circle
                  center={locationService}
                  radius={radiusService * 1000}
                  strokeColor="rgba(0,0,255,0.5)"
                  fillColor="rgba(0,0,255,0.2)"
                />
              </MapView>
            )}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Radius: {radiusService} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={50}
                step={1}
                value={radiusService}
                onValueChange={setRadiusService}
                minimumTrackTintColor="#007AFF"
                maximumTrackTintColor="#ccc"
              />
            </View>
            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setLocationModalVisible(false)} />
              <Button title="Save" onPress={() => setLocationModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4EBFF',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#F4EBFF',
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B5A',
    marginLeft: 16,
  },
  formPadding: {
    padding: 20,
  },
  label: {
    fontSize: 16, 
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#CBD5E0', 
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', 
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E0',
    borderRadius: 10,
    height: 50,
  },
   dropdownPlaceholder: {
       color: "#A0AEC0",
   },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E0',
    borderRadius: 10,
  },
  dropdownItemLabel: {
      color: '#4A5568'
  },
  dropdownSelectedItemLabel: {
      color: '#2D1B5A',
      fontWeight: "bold",
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 10,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#B78BFA',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  radioButtonSelected: {
    backgroundColor: '#B78BFA',
    borderColor: '#B78BFA',
  },
  radioText: {
    color: '#5A31F4',
    fontWeight: '500',
  },
  radioTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  unitSelector: {
    flexDirection: 'row',
    marginLeft: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E0',
    overflow: 'hidden',
  },
  unitOption: {
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  unitOptionSelected: {
    backgroundColor: '#EFE3FF',
  },
  unitOptionText: {
    fontSize: 15,
    color: '#5A31F4',
    fontWeight: '500',
  },
  unitOptionTextSelected: {
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#B78BFA',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 5,
  },
  secondaryButtonText: {
    color: '#5A31F4',
    fontSize: 16,
    fontWeight: '600',
  },
  infoText: {
    marginTop: 5,
    marginBottom: 15,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  imagePreviewContainer: {
      marginVertical: 15,
      paddingLeft: 5,
  },
  imageThumbContainer: {
      position: 'relative',
      marginRight: 10,
  },
  imagePreview: {
      width: 100,
      height: 100,
      borderRadius: 8,
      backgroundColor: '#E0E0E0',
  },
  removeImageButton: {
      position: 'absolute',
      top: 5, 
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 15,
      width: 24, 
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
  },
  submitButtonContainer: {
      marginTop: 25,
      marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5A31F4',
  },
  primaryButtonText: {
    color: '#5A31F4',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
      backgroundColor: '#E0E0E0',
      borderColor: '#BDBDBD',
  },
  locationModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  locationModal: { width: '90%', maxWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  locationModalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#2D1B5A' },
  map: { width: '100%', height: 250, marginBottom: 15, borderRadius: 8 },
  sliderContainer: { width: '100%', alignItems: 'stretch', marginVertical: 10 },
  sliderLabel: { fontSize: 16, marginBottom: 8, color: '#4A5568', textAlign: 'center' },
  slider: { width: '100%', height: 40 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#EAEAEA' },
  modalButton: {
     backgroundColor: '#EFE3FF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalButtonText: { color: '#5A31F4', fontWeight: '600', fontSize: 16 }
});

