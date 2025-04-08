import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

const { width } = Dimensions.get('window');

export default function ServiceDetailsScreen({ route }) {
  const { service } = route.params;

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
        {service.images?.length > 0 ? (
          service.images.map((uri, index) => (
            <Image key={index} source={{ uri }} style={styles.image} />
          ))
        ) : (
          <Image source={{ uri: 'https://via.placeholder.com/300' }} style={styles.image} />
        )}
      </ScrollView>

      <View style={styles.content}>
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.subtitle}>by {service.username}</Text>
        <Text style={styles.category}>Category: {service.category}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{service.description}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Text style={styles.price}>
            {service.priceType === 'hourly' ? `$${service.price}/hr` : `$${service.price}`}
          </Text>
          <Text style={styles.delivery}>⏱️ {service.deliveryTime}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>💬 Contact Provider</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>📦 Book Service</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  image: {
    width,
    height: 250,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: -4,
  },
  category: {
    fontSize: 14,
    color: '#B78BFA',
    fontWeight: '500',
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#444',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  delivery: {
    fontSize: 14,
    color: '#666',
  },
  primaryButton: {
    backgroundColor: '#B78BFA',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#B78BFA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#EFE3FF',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#7A42D3',
    fontWeight: '600',
    fontSize: 15,
  },
});
