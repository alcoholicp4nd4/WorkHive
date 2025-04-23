import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { db } from '../database/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';

export default function ChatScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { currentUserId, providerId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [providerName, setProviderName] = useState('Loading...');

  const conversationId = [currentUserId, providerId].sort().join('_');
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');

  useEffect(() => {
    const fetchProviderDetails = async () => {
      if (!providerId) return;
      try {
        const providerDocRef = doc(db, 'users', providerId);
        const providerDoc = await getDoc(providerDocRef);
        if (providerDoc.exists()) {
          const name = providerDoc.data().username || providerDoc.data().name || 'Provider';
          setProviderName(name);
        } else {
          setProviderName('Provider Not Found');
        }
      } catch (error) {
        console.error("Error fetching provider details:", error);
        setProviderName('Error');
      }
    };

    fetchProviderDetails();
  }, [providerId]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.headerTitleText}>{providerName}</Text>
        </View>
      ),
    });
  }, [navigation, providerName]);

  useEffect(() => {
    const loadMessages = async () => {
      const conversationDoc = doc(db, 'conversations', conversationId);
      const exists = await getDoc(conversationDoc);
      if (!exists.exists()) {
        await setDoc(conversationDoc, {
          participants: [currentUserId, providerId],
          createdAt: new Date()
        });
      }
    };

    loadMessages();

    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(fetched);
    });

    return () => unsubscribe();
  }, [conversationId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await addDoc(messagesRef, {
      senderId: currentUserId,
      text: newMessage.trim(),
      timestamp: new Date()
    });
    setNewMessage('');
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageContainer, item.senderId === currentUserId ? styles.myMessage : styles.otherMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
          placeholder="Type a message..."
        />
        <Button title="Send" style={styles.Button} onPress={handleSend} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#EAE2F8', 
    padding: 10
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'green',
    marginRight: 8,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D0A59',
  },
  messageContainer: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 8,
    maxWidth: '80%',
  },
  myMessage: {
    backgroundColor: '#B78BFA',
    alignSelf: 'flex-end',
  },
  otherMessage: {
    backgroundColor: '#F4A400',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#2D0A59', // Dark Purple for text
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#B78BFA',
    padding: 8
  },
  input: {
    flex: 1,
    borderColor: '#B78BFA',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 8,
    backgroundColor: '#FFFFFF'
  },
  Button:{
    borderRadius: 8,
    color: 'green'
  }
});
