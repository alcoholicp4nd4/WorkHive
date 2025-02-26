import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { styles } from '../Styles/styles';

const RegisterScreen = ({ navigation }) => {
  const handleRegister = () => {
    // Perform registration logic here (e.g., API call, validation)
    // For now, just navigate back to Login
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register</Text>
      <TextInput style={styles.input} placeholder="Username" />
      <TextInput style={styles.input} placeholder="Email" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      <Button title="Register" onPress={handleRegister} />
      <Button title="Back to Login" onPress={() => navigation.goBack()} />
    </View>
  );
};

export default RegisterScreen;