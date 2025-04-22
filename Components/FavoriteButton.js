import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';
import { Heart } from 'lucide-react-native';

const FavoriteButton = ({ serviceId, onFavoriteChange }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      checkFavoriteStatus();
    }
  }, [serviceId, currentUser]);

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
      alert('Please login to add favorites');
      return;
    }

    try {
      if (isFavorite) {
        // Remove from favorites
        await deleteDoc(doc(db, 'favorites', favoriteId));
        setIsFavorite(false);
        setFavoriteId(null);
        if (onFavoriteChange) {
          onFavoriteChange(false);
        }
      } else {
        // Add to favorites
        const favoritesRef = collection(db, 'favorites');
        const newFavorite = await addDoc(favoritesRef, {
          userId: currentUser.uid,
          serviceId,
          createdAt: new Date()
        });
        setIsFavorite(true);
        setFavoriteId(newFavorite.id);
        if (onFavoriteChange) {
          onFavoriteChange(true);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      alert('Failed to update favorite status');
    }
  };

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
});

export default FavoriteButton; 