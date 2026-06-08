import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api';
import { haptics } from '../../utils/haptics';

export default function PhotoUploadScreen({ navigation }: any) {
  const { user, updateUser } = useAuth();
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(user?.profile_photo_url || null);
  const [isLoading, setIsLoading] = useState(false);

  const pickImage = async (isProfile: boolean) => {
    haptics.light();
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: isProfile ? [1, 1] : [4, 5],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      uploadPhoto(uri, isProfile);
    }
  };

  const uploadPhoto = async (uri: string, isProfile: boolean) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append(isProfile ? 'photo' : 'photos', {
        uri,
        name: `photo_${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const endpoint = isProfile ? '/uploads/photo' : '/uploads/photos';
      const { data } = await api.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (isProfile) {
        setProfilePhoto(data.url);
        updateUser({ profile_photo_url: data.url });
      } else {
        setPhotos(data.photos);
        updateUser({ photos: data.photos });
      }
      haptics.success();
    } catch (error) {
      console.error('Upload failed', error);
      haptics.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (!profilePhoto) return;
    haptics.medium();
    // In a real app, this might navigate to Bio/Education screen
    // For now, we'll navigate to Home or the next available screen
    navigation.navigate('BioEducation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add your best photos</Text>
        <Text style={styles.subtitle}>Upload a profile photo to continue.</Text>

        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.photoBox, styles.profileBox, profilePhoto ? styles.photoBoxFilled : null]}
            onPress={() => pickImage(true)}
            disabled={isLoading}
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.image} />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.plusIcon}>+</Text>
                <Text style={styles.placeholderText}>Profile</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Render 5 gallery slots */}
          {[...Array(5)].map((_, i) => {
            const photoUrl = photos[i];
            return (
              <TouchableOpacity
                key={i}
                style={[styles.photoBox, photoUrl ? styles.photoBoxFilled : null]}
                onPress={() => pickImage(false)}
                disabled={isLoading}
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.image} />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.plusIcon}>+</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.nextButton, !profilePhoto && styles.nextButtonDisabled]} 
          onPress={handleNext}
          disabled={!profilePhoto || isLoading}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  photoBox: {
    width: '31%',
    aspectRatio: 3/4,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  profileBox: {
    width: '65%', // Takes up 2 columns
    aspectRatio: 1,
    borderColor: '#fff',
  },
  photoBoxFilled: {
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    opacity: 0.5,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    opacity: 0.8,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    margin: 24,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  nextButton: {
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#333',
  },
  nextButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
