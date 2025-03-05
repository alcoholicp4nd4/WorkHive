import React from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { styles } from '../Styles/styles';

const LoginScreen = ({ navigation }) => {
  const handleLogin = () => {
    // Perform login logic here (e.g., API call, validation)
    // For now, just navigate to the MainApp (Tab Navigator)
    navigation.navigate('MainApp');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput style={styles.input} placeholder="Username" />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry />
      <Button title="Login" onPress={handleLogin} />
      <Button
        title="Go to Register"
        onPress={() => navigation.navigate('Register')}
      />
    </View>
  );
};

export default LoginScreen;