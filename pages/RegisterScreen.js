import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image 
} from 'react-native';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { registerUser } from '../database/authDatabase';
import { styles } from '../Styles/styles';
import { Video } from 'expo-av'; // import for animated background

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    console.log("🔹 Attempting registration...");
    
    const response = await registerUser(username, email, password);
    setLoading(false);

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
    <View style={styles.background}>
      <Video
        source={require('../assets/animated-background.mp4')}
        style={styles.backgroundVideo}
        shouldPlay
        isLooping
        resizeMode="cover"
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/favicon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Create an Account</Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Mail size={20} color="#B78BFA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor="#B78BFA"
              />
            </View>

            <View style={styles.inputContainer}>
              <Mail size={20} color="#B78BFA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholderTextColor="#B78BFA"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color="#B78BFA" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#B78BFA"
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Register</Text>
                  <ArrowRight size={20} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default RegisterScreen;
