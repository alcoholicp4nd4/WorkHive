import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../database/firebaseConfig';

/**
 * Sends a notification to a user.
 * @param {string} userId - The recipient's user ID.
 * @param {string} type - The type of notification (e.g., 'booking', 'status_update').
 * @param {string} message - The notification message.
 * @param {string} [relatedBookingId] - Optional related booking ID.
 */
export async function sendNotification(userId, type, message, relatedBookingId = null) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      message,
      relatedBookingId: relatedBookingId || null,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}