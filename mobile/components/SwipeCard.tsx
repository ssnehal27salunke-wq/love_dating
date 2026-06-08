import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { haptics } from '../utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface Profile {
  id: string;
  first_name: string;
  date_of_birth?: string;
  profile_photo_url?: string;
  profession?: string;
  bio?: string;
}

interface SwipeCardProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
}

export default function SwipeCard({ profile, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const getAge = (dob?: string) => {
    if (!dob) return 25;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx: any) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      if (translateX.value > SWIPE_THRESHOLD) {
        // Swiped Right (Like)
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeRight)(profile);
        });
        runOnJS(haptics.success)();
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        // Swiped Left (Pass)
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(onSwipeLeft)(profile);
        });
        runOnJS(haptics.light)();
      } else {
        // Spring back to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, -SWIPE_THRESHOLD], [0, 1], Extrapolate.CLAMP),
  }));

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Image
            source={{
              uri: profile.profile_photo_url || 'https://via.placeholder.com/400x600?text=No+Photo',
            }}
            style={styles.image}
          />
          
          <View style={styles.gradientOverlay} />

          {/* LIKE Badge */}
          <Animated.View style={[styles.badge, styles.likeBadge, likeOpacity]}>
            <Text style={styles.likeText}>LIKE</Text>
          </Animated.View>

          {/* NOPE Badge */}
          <Animated.View style={[styles.badge, styles.nopeBadge, nopeOpacity]}>
            <Text style={styles.nopeText}>PASS</Text>
          </Animated.View>

          <View style={styles.infoContainer}>
            <Text style={styles.name}>
              {profile.first_name}, {getAge(profile.date_of_birth)}
            </Text>
            {profile.profession ? (
              <Text style={styles.profession}>{profile.profession.replace('_', ' ')}</Text>
            ) : null}
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  card: {
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    top: '50%',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  profession: {
    fontSize: 18,
    color: '#EBEBF5',
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  badge: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 4,
  },
  likeBadge: {
    left: 40,
    borderColor: '#34C759',
    transform: [{ rotate: '-15deg' }],
  },
  nopeBadge: {
    right: 40,
    borderColor: '#FF3B30',
    transform: [{ rotate: '15deg' }],
  },
  likeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#34C759',
    letterSpacing: 2,
  },
  nopeText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FF3B30',
    letterSpacing: 2,
  },
});
