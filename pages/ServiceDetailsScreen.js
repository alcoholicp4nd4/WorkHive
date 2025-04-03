import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView } from 'react-native';
import React from 'react';

export default function ServiceDetailsScreen({ route }) {
  const { service } = route.params; // Get the service data passed from the HomeScreen

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{service.username}</Text>
          <Text style={styles.category}>{service.category}</Text>
        </View>
        
        <Image source={{ uri: service.image }} style={styles.image} />

        <View style={styles.details}>
          <Text style={styles.sectionTitle}>Service Description</Text>
          <Text style={styles.description}>{service.serviceDescription}</Text>
          
          <Text style={styles.sectionTitle}>Provider Description</Text>
          <Text style={styles.description}>{service.providerDescription}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f4f4f4',
  },
  container: {
    flex: 1,
    backgroundColor: '#f4f4f4',
    paddingHorizontal: 15,
  },
  header: {
    paddingTop: 50, // Adjusted to prevent overlap with notch
    paddingBottom: 20,
    backgroundColor: '#CB9DF0',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  category: {
    fontSize: 18,
    color: '#fff',
    marginTop: 5,
    textAlign: 'center',
  },
  image: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    marginTop: 15,
    marginBottom: 20,
    resizeMode: 'cover',
  },
  details: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'justify',
  },
});
