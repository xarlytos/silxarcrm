import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

export function useImagePicker() {
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = useCallback(async (): Promise<string | null> => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      return uri;
    }
    return null;
  }, []);

  const takePhoto = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      return uri;
    }
    return null;
  }, []);

  const resetImage = useCallback(() => {
    setImageUri(null);
  }, []);

  return {
    imageUri,
    pickImage,
    takePhoto,
    resetImage,
    setImageUri,
  };
}
