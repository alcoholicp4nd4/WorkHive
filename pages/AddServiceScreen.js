import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker'; // Use DropDownPicker for better dropdown UI
import { db } from '../database/firebaseConfig';  // Ensure you import Firebase setup correctly
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getCurrentUser } from '../database/authDatabase';  // Assuming you have this function for getting current user

export default function AddServiceScreen() {
  const [serviceDescription, setServiceDescription] = useState('');
  const [providerDescription, setProviderDescription] = useState('');
  const [category, setCategory] = useState(null);
  const [username, setUsername] = useState('');
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([
    { label: 'Web Development', value: 'web-development' },
    { label: 'Mobile Development', value: 'mobile-development' },
    { label: 'Graphic Design', value: 'graphic-design' },
    { label: 'SEO Optimization', value: 'seo-optimization' },
    // Add more categories as needed
  ]);

  // Fetch the current user's data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      if (user) {
        setUsername(user.username);  // Assuming user has a username field
      }
    };

    fetchUser();
  }, []);

  const handleSubmit = async () => {
    if (!serviceDescription || !providerDescription || !category || !username) {
      Alert.alert('Error', 'Please fill out all fields!');
      return;
    }

    try {
      // Add new service to Firestore
      const serviceData = {
        serviceDescription,
        providerDescription,
        category,
        username,  // Add username to associate the service with the user
        createdAt: serverTimestamp(),  // Add timestamp when service is added
      };

      await addDoc(collection(db, 'services'), serviceData);

      // Show success message
      Alert.alert('Success', 'Service added successfully!');
      
      // Reset form
      setServiceDescription('');
      setProviderDescription('');
      setCategory(null);
    } catch (error) {
      console.error('Error adding service:', error);
      Alert.alert('Error', 'There was an issue adding the service.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add New Service</Text>

      {/* Service Description */}
      <TextInput
        style={styles.input}
        placeholder="Enter service description"
        value={serviceDescription}
        onChangeText={setServiceDescription}
      />

      {/* Provider Description */}
      <TextInput
        style={styles.input}
        placeholder="Enter provider description"
        value={providerDescription}
        onChangeText={setProviderDescription}
      />

      {/* Category Dropdown */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Select Service Category</Text>
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
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
        <Button title="Submit" onPress={handleSubmit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    marginBottom: 15,
    paddingLeft: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  dropdown: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    height: 45,
  },
  dropdownContainer: {
    borderColor: '#ccc',
    borderRadius: 8,
  },
  buttonContainer: {
    marginTop: 20,
    borderRadius: 8,
  },
});
