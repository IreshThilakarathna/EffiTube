import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { signOut } from '../services/firebase';
import { fetchHomeVideos, searchVideos, fetchWatchHistory, YouTubeVideo } from '../services/youtube';

const { width } = Dimensions.get('window');

export const HomeScreen = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showWatchHistory, setShowWatchHistory] = useState(false);

  const loadVideos = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const fetchedVideos = showWatchHistory 
        ? await fetchWatchHistory()
        : await fetchHomeVideos();
      
      setVideos(fetchedVideos);
    } catch (error: any) {
      if (error.message.includes('YouTube scope')) {
        Alert.alert(
          'Permission Required',
          'Please sign out and sign in again to grant access to your YouTube watch history.',
          [{ text: 'OK' }]
        );
      }
      setError(error.message || 'Failed to load videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadVideos();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const searchResults = await searchVideos(searchQuery);
      setVideos(searchResults);
    } catch (error: any) {
      setError(error.message || 'Failed to search videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [showWatchHistory]);

  const renderVideoItem = ({ item }: { item: YouTubeVideo }) => (
    <TouchableOpacity style={styles.videoCard}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.channelTitle}>{item.channelTitle}</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>{item.viewCount} views</Text>
          <Text style={styles.statsText}> • </Text>
          <Text style={styles.statsText}>{item.likeCount} likes</Text>
          {showWatchHistory && item.watchedAt && (
            <>
              <Text style={styles.statsText}> • </Text>
              <Text style={styles.statsText}>Watched on {new Date(item.watchedAt).toLocaleDateString()}</Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search videos..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, !showWatchHistory && styles.activeTab]}
          onPress={() => setShowWatchHistory(false)}
        >
          <Text style={[styles.tabText, !showWatchHistory && styles.activeTabText]}>
            Home
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showWatchHistory && styles.activeTab]}
          onPress={() => setShowWatchHistory(true)}
        >
          <Text style={[styles.tabText, showWatchHistory && styles.activeTabText]}>
            Watch History
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator size="large" color="#FF0000" style={styles.loader} />
      ) : (
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.videoList}
          onRefresh={() => loadVideos(true)}
          refreshing={refreshing}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  signOutButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF0000',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#FF0000',
    fontWeight: '600',
  },
  videoList: {
    padding: 16,
  },
  videoCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: (width - 32) * (9 / 16), // 16:9 aspect ratio
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  channelTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statsText: {
    fontSize: 12,
    color: '#888',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF0000',
    textAlign: 'center',
    padding: 16,
  },
});
