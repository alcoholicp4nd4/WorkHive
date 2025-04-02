import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import FastImage from 'react-native-fast-image'; // Import FastImage
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { loginUser } from '../database/authDatabase';
import { styles } from '../Styles/styles';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      console.log("🔹 Attempting login...");
      const response = await loginUser(email, password);
      setLoading(false);

      if (response.success) {
        console.log("✅ Login successful!");
        Alert.alert("Login Successful", `Welcome, ${response.user.email}!`);
        navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      } else {
        console.warn("❌ Error:", response.error);
        setError(response.error);
      }
    } catch (error) {
      setLoading(false);
      console.error("❌ Login Error:", error);
      setError("An unexpected error occurred.");
    }
  };

  return (
    <View style={styles.container}>
      <FastImage 
        source={require('../assets/animated-background.gif')} 
        style={styles.background} 
        resizeMode={FastImage.resizeMode.cover}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/favicon.png')}
            style={styles.logo} 
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your account to continue</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#B78BFA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#B78BFA"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#B78BFA" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#B78BFA"
            />
          </View>

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <ArrowRight size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;
