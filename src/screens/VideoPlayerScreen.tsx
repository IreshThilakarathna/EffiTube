import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import WebView from 'react-native-webview';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  VideoPlayer: { videoId: string };
};

type VideoPlayerScreenProps = {
  route: RouteProp<RootStackParamList, 'VideoPlayer'>;
  navigation: NativeStackNavigationProp<RootStackParamList, 'VideoPlayer'>;
};

const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({ route }) => {
  const { videoId } = route.params;

  // Create embedded YouTube URL
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;

  return (
    <View style={styles.container}>
      <WebView
        style={styles.webview}
        source={{ uri: embedUrl }}
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    width: Dimensions.get('window').width,
    aspectRatio: 16 / 9,
  },
});

export default VideoPlayerScreen;
