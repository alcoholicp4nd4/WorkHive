import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';
import { getAuth } from 'firebase/auth';

const ServiceRating = ({ serviceId, onRatingSubmit, readOnly = false }) => {
  const [rating, setRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchAverageRating();
    if (currentUser && !readOnly) {
      fetchUserRating();
    }
  }, [serviceId]);

  const fetchAverageRating = async () => {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(ratingsRef, where('serviceId', '==', serviceId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        let totalRating = 0;
        querySnapshot.forEach((doc) => {
          totalRating += doc.data().rating;
        });
        const avg = totalRating / querySnapshot.size;
        setAverageRating(avg.toFixed(1));
      }
    } catch (error) {
      console.error('Error fetching average rating:', error);
    }
  };

  const fetchUserRating = async () => {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(
        ratingsRef,
        where('serviceId', '==', serviceId),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const rating = querySnapshot.docs[0].data().rating;
        setUserRating(rating);
        setRating(rating);
        setTempRating(rating);
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const handleRating = (selectedRating) => {
    if (readOnly) return;
    setTempRating(selectedRating);
  };

  const handleConfirmRating = async () => {
    if (!currentUser) {
      alert('Please login to rate this service');
      return;
    }

    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(
        ratingsRef,
        where('serviceId', '==', serviceId),
        where('userId', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create new rating
        await addDoc(ratingsRef, {
          serviceId,
          userId: currentUser.uid,
          rating: tempRating,
          createdAt: new Date()
        });
      } else {
        // Update existing rating
        const ratingDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'ratings', ratingDoc.id), {
          rating: tempRating,
          updatedAt: new Date()
        });
      }

      setRating(tempRating);
      setUserRating(tempRating);
      setIsEditing(false);
      fetchAverageRating();
      if (onRatingSubmit) {
        onRatingSubmit(tempRating);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    }
  };

  if (readOnly) {
    return (
      <View style={styles.container}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={[
                styles.star,
                star <= averageRating ? styles.starFilled : styles.starEmpty
              ]}
            >
              ★
            </Text>
          ))}
        </View>
        <Text style={styles.averageRating}>
          {averageRating} ⭐ ({averageRating > 0 ? 'Rated' : 'No ratings yet'})
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate this Service</Text>
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRating(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.star,
              star <= (isEditing ? tempRating : rating) ? styles.starFilled : styles.starEmpty
            ]}>
              ★
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.averageRating}>
        Average Rating: {averageRating} ⭐
      </Text>
      
      {userRating > 0 && !isEditing ? (
        <TouchableOpacity 
          style={styles.changeButton}
          onPress={() => {
            setIsEditing(true);
            setTempRating(rating);
          }}
        >
          <Text style={styles.changeButtonText}>Change Rating</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[styles.confirmButton, tempRating === 0 && styles.disabledButton]}
          onPress={handleConfirmRating}
          disabled={tempRating === 0}
        >
          <Text style={styles.confirmButtonText}>
            {userRating > 0 ? 'Update Rating' : 'Confirm Rating'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    marginVertical: 10,
    padding: 0,
    borderRadius: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  star: {
    fontSize: 30,
  },
  starFilled: {
    color: '#FFD700',
  },
  starEmpty: {
    color: '#D3D3D3',
  },
  averageRating: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  confirmButton: {
    backgroundColor: '#5A31F4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#D3D3D3',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  changeButton: {
    backgroundColor: '#EFE3FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  changeButtonText: {
    color: '#5A31F4',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ServiceRating; 