import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { registerUser } from '../database/authDatabase';
import { styles } from '../Styles/styles';

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    console.log("🔹 Attempting registration...");
    const response = await registerUser(username, email, password);

    if (response.success) {
      console.log("✅ Registration successful:", response.user);
      Alert.alert("Account Created", `Welcome, ${email}!`);
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    } else {
      console.warn("❌ Registration Error:", response.error);
      Alert.alert("Registration Failed", response.error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
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
      <Button title="Register" onPress={handleRegister} />
      <Button title="Already have an account? Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
};

export default RegisterScreen;
