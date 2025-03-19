import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { loginUser } from '../database/authDatabase';
import { styles } from '../Styles/styles';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      console.log("🔹 Attempting login...");
      const response = await loginUser(email, password);

      if (response.success) {
        console.log("✅ Login successful!");
        Alert.alert("Login Successful", `Welcome, ${response.user.email}!`);
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else {
        console.warn("❌ Error:", response.error);
        Alert.alert("Login Failed", response.error);
      }
    } catch (error) {
      console.error("❌ Login Error:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
};

export default LoginScreen;
