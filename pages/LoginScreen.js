import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Import AsyncStorage
import { styles } from '../Styles/styles';
import { loginUser } from '../database/authDatabase';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      console.log("🔹 Attempting login...");
      const response = await loginUser(username, password);

      if (response.success) {
        console.log("✅ Login successful:", response.user);

        // ✅ Store user session in AsyncStorage
        await AsyncStorage.setItem('loggedInUser', JSON.stringify(response.user));

         // ✅ Retrieve saved profile picture for this user
      const savedProfileImage = await AsyncStorage.getItem(`profileImage_${response.user.username}`);

        Alert.alert("Login Successful", `Welcome, ${response.user.username}!`);
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] }); // ✅ Prevent back navigation
      } else {
        console.warn("❌ Login Failed:", response.error);
        Alert.alert("Login Failed", response.error);
      }
    } catch (error) {
      console.error("❌ Login Error:", error);
      Alert.alert("Error", "An unexpected error occurred. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Login" onPress={handleLogin} />
      <Button title="Go to Register" onPress={() => navigation.navigate('Register')} />
    </View>
  );
};

export default LoginScreen;
