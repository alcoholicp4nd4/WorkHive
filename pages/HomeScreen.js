import React, { useState, useRef } from 'react';
import { View, Text, Button, SectionList, TouchableOpacity, ScrollView } from 'react-native';
import { styles } from '../Styles/styles';

const categories = [
  { title: 'Web Development', data: [
      { name: 'John Doe', service: 'Frontend Developer', experience: '5 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'Jane Smith', service: 'Backend Developer', experience: '3 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Alex Johnson', service: 'Full Stack Developer', experience: '4 years', rating: '⭐️⭐️⭐️⭐️' }
    ] },
  { title: 'Graphic Design', data: [
      { name: 'Emily White', service: 'Logo Designer', experience: '6 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Chris Black', service: 'UI/UX Designer', experience: '4 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'Sam Green', service: 'Illustrator', experience: '2 years', rating: '⭐️⭐️⭐️' }
    ] },
  { title: 'Marketing', data: [
      { name: 'Michael Brown', service: 'SEO Specialist', experience: '5 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'Laura Blue', service: 'Social Media Manager', experience: '3 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Tom Red', service: 'Content Marketer', experience: '4 years', rating: '⭐️⭐️⭐️⭐️' }
    ] },
  { title: 'Photography', data: [
      { name: 'Anna White', service: 'Wedding Photographer', experience: '8 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Mark Blue', service: 'Portrait Photographer', experience: '5 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'Sarah Green', service: 'Product Photographer', experience: '6 years', rating: '⭐️⭐️⭐️⭐️' }
    ] },
  { title: 'Writing', data: [
      { name: 'David Black', service: 'Copywriter', experience: '7 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Sophia Grey', service: 'Content Writer', experience: '4 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'James Red', service: 'Technical Writer', experience: '5 years', rating: '⭐️⭐️⭐️⭐️' }
    ] },
  { title: 'Data Science', data: [
      { name: 'Alice Brown', service: 'Data Analyst', experience: '5 years', rating: '⭐️⭐️⭐️⭐️' },
      { name: 'Bob White', service: 'Machine Learning Engineer', experience: '6 years', rating: '⭐️⭐️⭐️⭐️⭐️' },
      { name: 'Charlie Green', service: 'AI Researcher', experience: '4 years', rating: '⭐️⭐️⭐️⭐️' }
    ] }
];

const HomeScreen = ({ navigation }) => {
  const sectionListRef = useRef(null);

  const scrollToCategory = (index) => {
    sectionListRef.current?.scrollToLocation({ 
      sectionIndex: index, 
      itemIndex: 0, 
      animated: true,
      viewPosition: 0
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Button title="Logout" onPress={() => navigation.navigate('Login')} />
      
      <ScrollView horizontal style={styles.taskBar} showsHorizontalScrollIndicator={false}>
        {categories.map((category, index) => (
          <TouchableOpacity key={index} style={styles.taskBarItem} onPress={() => scrollToCategory(index)}>
            <Text style={styles.taskBarText}>{category.title}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <SectionList
        ref={sectionListRef}
        sections={categories}
        keyExtractor={(item, index) => item.name + index}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.service}</Text>
            <Text style={styles.cardDetail}>Experience: {item.experience}</Text>
            <Text style={styles.cardDetail}>Rating: {item.rating}</Text>
          </View>
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
      />
    </View>
  );
};

export default HomeScreen;
