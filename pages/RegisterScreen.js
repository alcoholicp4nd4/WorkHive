import React from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { styles } from '../Styles/styles';

const RegisterScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Username" />
      <TextInput style={styles.input} placeholder="Email" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      <Button title="Register" onPress={() => navigation.navigate('Login')} />
      <Button title="Back to Login" onPress={() => navigation.goBack()} />
    </View>
  );
};

export default RegisterScreen;