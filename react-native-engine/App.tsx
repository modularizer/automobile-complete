import { StatusBar } from 'expo-status-bar';
import { StyleSheet, SafeAreaView } from 'react-native';
import AutocompleteDemo from './src/components/AutocompleteDemo';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <AutocompleteDemo />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
