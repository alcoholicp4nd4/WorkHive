import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const mockMonthlyBookings = {
  'Jan': 2,
  'Feb': 5,
  'Mar': 3,
  'Apr': 8,
  'May': 4,
  'Jun': 6,
  'Jul': 10,
  'Aug': 7,
  'Sep': 5,
  'Oct': 9,
  'Nov': 2,
  'Dec': 4,
};

export default function AnalyticsScreen() {
  const maxValue = Math.max(...Object.values(mockMonthlyBookings));

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>📊 Monthly Booking Analytics</Text>
      <View style={styles.chart}>
        {Object.entries(mockMonthlyBookings).map(([month, value]) => {
          const barWidth = (value / maxValue) * 100 + '%';
          return (
            <View key={month} style={styles.barContainer}>
              <Text style={styles.month}>{month}</Text>
              <View style={[styles.bar, { width: barWidth }]}>
                <Text style={styles.barText}>{value}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f9f6ff',
    flex: 1,
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6f42c1',
    marginBottom: 20,
    textAlign: 'center',
  },
  chart: {
    marginTop: 10,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  month: {
    width: 40,
    fontWeight: '600',
    marginRight: 10,
  },
  bar: {
    height: 25,
    backgroundColor: '#CB9DF0',
    borderRadius: 5,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  barText: {
    color: '#fff',
    fontWeight: '600',
  },
});
