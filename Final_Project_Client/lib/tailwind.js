import { StyleSheet } from 'react-native';

export const tw = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#1f2937', // gray-800
  },
  // Input styles
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  // Button styles
  button: {
    width: '100%',
    height: 48,
    backgroundColor: '#3b82f6', // blue-500
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Link styles
  link: {
    marginTop: 16,
  },
  linkText: {
    color: '#3b82f6', // blue-500
    textAlign: 'center',
    fontSize: 14,
  },
  // Error text
  errorText: {
    color: '#ef4444', // red-500
    marginBottom: 12,
    textAlign: 'center',
  },
});

// Helper function to combine multiple style objects
export const combineStyles = (...styles) => {
  return StyleSheet.flatten(styles);
};
