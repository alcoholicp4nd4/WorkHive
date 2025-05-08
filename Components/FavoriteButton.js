import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { Heart } from 'lucide-react-native';

const FavoriteButton = ({ serviceId, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [serviceOwnerId, setServiceOwnerId] = useState(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      checkFavoriteStatus();
    }
    if (serviceId) {
      fetchServiceOwner();
    }
  }, [serviceId, currentUser]);

  const fetchServiceOwner = async () => {
    try {
      const serviceRef = doc(db, 'services', serviceId);
      const serviceSnap = await getDoc(serviceRef);
      if (serviceSnap.exists()) {
        setServiceOwnerId(serviceSnap.data().userId);
      } else {
        console.log("No such service document!");
        setServiceOwnerId(null);
      }
    } catch (error) {
      console.error("Error fetching service owner:", error);
      setServiceOwnerId(null);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const favoritesRef = collection(db, 'favorites');
      const q = query(
        favoritesRef,
        where('userId', '==', currentUser.uid),
        where('serviceId', '==', serviceId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsFavorite(true);
        setFavoriteId(querySnapshot.docs[0].id);
      } else {
        setIsFavorite(false);
        setFavoriteId(null);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to add favorites');
      return;
    }

    if (serviceOwnerId && currentUser.uid === serviceOwnerId) {
      Alert.alert('Action Not Allowed', 'You cannot favorite your own service.');
      return;
    }

    try {
      if (isFavorite) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
        if (onFavoriteChange) onFavoriteChange(false);
      } else {
        const favoritesRef = collection(db, 'favorites');
        const newFavorite = await addDoc(favoritesRef, {
          userId: currentUser.uid,
          serviceId,
          createdAt: new Date()
        });
        setIsFavorite(true);
        setFavoriteId(newFavorite.id);
        if (onFavoriteChange) onFavoriteChange(true);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  if (serviceOwnerId && currentUser && currentUser.uid === serviceOwnerId) {
    return (
      <TouchableOpacity
        style={[styles.favoriteButton, styles.disabledFavoriteButton]}
        disabled={true}
      >
        <Heart
          size={24}
          color={'#ccc'}
          fill={'none'}
        />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={styles.favoriteButton}
      onPress={toggleFavorite}
    >
      <Heart
        size={24}
        color={isFavorite ? '#FF3B30' : '#666'}
        fill={isFavorite ? '#FF3B30' : 'none'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  favoriteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledFavoriteButton: {
    backgroundColor: '#f0f0f0',
  },
});

export default FavoriteButton; 