import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export default function FavoriteScreen() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const fetchFavorites = async () => {
    try {
      // Get user's favorite service IDs
      const favoritesRef = collection(db, 'favorites');
      const q = query(favoritesRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const favoriteIds = querySnapshot.docs.map(doc => doc.data().serviceId);
      
      if (favoriteIds.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Fetch the actual service details
      const services = [];
      for (const serviceId of favoriteIds) {
        const serviceDoc = await getDoc(doc(db, 'services', serviceId));
        if (serviceDoc.exists()) {
          services.push({ id: serviceId, ...serviceDoc.data() });
        }
      }

      setFavorites(services);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        fetchFavorites();
      }
    }, [currentUser])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFavorites();
  }, []);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading favorites...</Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please login to view your favorites</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No favorite services yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={renderService}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#5A31F4']}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 15,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  serviceInfo: {
    padding: 15,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  servicePrice: {
    fontSize: 16,
    color: '#5A31F4',
    fontWeight: '600',
    marginBottom: 5,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#666',
  },
});