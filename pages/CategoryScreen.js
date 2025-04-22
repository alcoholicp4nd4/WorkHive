import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, SafeAreaView, StatusBar } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function CategoryScreen({ route, navigation }) {
  const { category, subcategories } = route.params;
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  useEffect(() => {
    fetchServices();
  }, [selectedSubcategory]);

  const fetchServices = async () => {
    try {
      const servicesRef = collection(db, 'services');
      let q;
      
      if (selectedSubcategory) {
        q = query(servicesRef, where('category', '==', selectedSubcategory));
      } else {
        // If no subcategory is selected, fetch all services in the main category
        // We need to check if the service's category is any of the subcategories
        const subcategoryIds = subcategories.map(sub => sub.id);
        q = query(
          servicesRef,
          where('category', 'in', subcategoryIds)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const fetchedServices = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setServices(fetchedServices);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
    }
  };

  const renderService = ({ item }) => (
    <TouchableOpacity
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { service: item })}
    >
      <Image
        source={{ uri: item.images?.[0] || 'https://via.placeholder.com/300' }}
        style={styles.serviceImage}
      />
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceTitle}>{item.title}</Text>
        <Text style={styles.servicePrice}>
          {item.priceType === 'hourly' ? `$${item.price}/hr` : `$${item.price}`}
        </Text>
        <Text style={styles.serviceProvider}>by {item.username}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.header}>{category}</Text>
        </View>
        
        <View style={styles.subcategoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoriesList}
          >
            <TouchableOpacity
              style={[
                styles.subcategoryButton,
                !selectedSubcategory && styles.selectedSubcategory
              ]}
              onPress={() => setSelectedSubcategory(null)}
            >
              <Text style={[
                styles.subcategoryText,
                !selectedSubcategory && styles.selectedSubcategoryText
              ]}>
                All
              </Text>
            </TouchableOpacity>
            {subcategories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.subcategoryButton,
                  selectedSubcategory === item.id && styles.selectedSubcategory
                ]}
                onPress={() => setSelectedSubcategory(item.id)}
              >
                <Text style={[
                  styles.subcategoryText,
                  selectedSubcategory === item.id && styles.selectedSubcategoryText
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No services found in this category.</Text>
          </View>
        ) : (
          <FlatList
            data={services}
            renderItem={renderService}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  subcategoriesContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subcategoriesList: {
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  subcategoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 25,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedSubcategory: {
    backgroundColor: '#5A31F4',
    borderColor: '#5A31F4',
  },
  subcategoryText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  selectedSubcategoryText: {
    color: '#fff',
  },
  listContainer: {
    padding: 15,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 220,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  serviceInfo: {
    padding: 20,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  servicePrice: {
    fontSize: 18,
    color: '#5A31F4',
    fontWeight: '700',
    marginBottom: 8,
  },
  serviceProvider: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
}); 