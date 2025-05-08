import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

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

      // Fetch ratings for these services
      const ratingsRef = collection(db, 'ratings');
      const ratingsSnapshot = await getDocs(ratingsRef);
      const ratings = ratingsSnapshot.docs.map(doc => doc.data());

      // Attach average rating to each service
      const servicesWithRatings = services.map(service => {
        const serviceRatings = ratings.filter(r => r.serviceId === service.id && typeof r.rating === 'number');
        const avgRating = serviceRatings.length > 0
          ? serviceRatings.reduce((sum, r) => sum + r.rating, 0) / serviceRatings.length
          : null;
        return { ...service, rating: avgRating };
      });

      setFavorites(servicesWithRatings);
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

  const getDisplayRating = (service) => (
    typeof service.rating === 'number' ? service.rating.toFixed(1) : 'N/A'
  );

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ServiceDetails', { service: item })}
    >
      <FlatList
        data={
          item.images && item.images.length > 0
            ? item.images
            : ['https://via.placeholder.com/300']
        }
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, idx) => idx.toString()}
        renderItem={({ item: imageUri }) => (
          <Image
            source={{ uri: imageUri }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
      />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardUsername}>by {item.username}</Text>
        <Text style={styles.cardCategory}>{item.category}</Text>
        <View style={styles.cardBottomRow}>
          <Text style={styles.cardPrice}>
            {item.priceType === 'hourly' ? `${item.price} TND/hr` : `${item.price} TND`}
          </Text>
          <Text style={styles.cardDelivery}>{item.deliveryTime}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Icon name="star" size={16} color="#C4B5FD" />
          <Text style={{ marginLeft: 4, color: '#333', fontWeight: '500' }}>{getDisplayRating(item)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading favorites...</Text>
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
        renderItem={renderServiceItem}
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
    backgroundColor: '#F4EBFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4EBFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#5A31F4',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F4EBFF',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardImage: {
    width: width - 40,
    height: 200,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  cardCategory: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '600',
    marginBottom: 12,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardDelivery: {
    fontSize: 14,
    color: '#666',
  },
});