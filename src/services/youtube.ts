import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const API_KEY = 'AIzaSyBxXpfFpuXvBAfDuXSZvJXha8Y9SZPm0qo';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  duration: string;
  categoryId: string;
  watchedAt?: string;
}

interface YouTubeVideoDetails {
  statistics?: {
    viewCount?: string;
    likeCount?: string;
  };
  contentDetails?: {
    duration?: string;
  };
}

export const formatViewCount = (count: string): string => {
  const num = parseInt(count, 10);
  if (isNaN(num)) return 'N/A';
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return count;
};

const formatDuration = (duration: string): string => {
  const match = duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return '';

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Configure Google Sign-In with YouTube scope
GoogleSignin.configure({
  scopes: ['https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.clips',
    'https://www.googleapis.com/auth/youtube.music'],
  webClientId: '340127321507-0ghh9s0e9d3qfa4qnk8921jmr6sjgn6j.apps.googleusercontent.com',
});

export const fetchHomeVideos = async (): Promise<YouTubeVideo[]> => {
  try {
    // First, get video categories
    const categoriesResponse = await fetch(
      `${BASE_URL}/videoCategories?part=snippet&regionCode=IN&key=${API_KEY}`
    );
    const categoriesData = await categoriesResponse.json();
    
    // Get videos from multiple categories
    const categoryPromises = categoriesData.items
      .slice(0, 3) // Take first 3 categories for variety
      .map(async (category: any) => {
        const response = await fetch(
          `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&videoCategoryId=${category.id}&regionCode=IN&maxResults=10&key=${API_KEY}`
        );
        const data = await response.json();
        return data.items || [];
      });

    const categoryResults = await Promise.all(categoryPromises);
    const allVideos = categoryResults.flat();

    // Sort videos by a combination of factors (recency, views, and engagement)
    const sortedVideos = allVideos.sort((a: any, b: any) => {
      const aScore = calculateVideoScore(a);
      const bScore = calculateVideoScore(b);
      return bScore - aScore;
    });

    return sortedVideos.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
      viewCount: formatViewCount(item.statistics.viewCount),
      likeCount: formatViewCount(item.statistics.likeCount || '0'),
      duration: formatDuration(item.contentDetails.duration),
      categoryId: item.snippet.categoryId,
    }));
  } catch (error) {
    console.error('Error fetching home videos:', error);
    throw error;
  }
};

const calculateVideoScore = (video: any): number => {
  const stats = video.statistics || {};
  const viewCount = parseInt(stats.viewCount, 10) || 0;
  const likeCount = parseInt(stats.likeCount, 10) || 0;
  const publishedAt = new Date(video.snippet.publishedAt).getTime();
  const now = Date.now();
  const age = (now - publishedAt) / (1000 * 60 * 60); // Age in hours

  // Score formula: views + likes * 2 - age penalty
  return viewCount + (likeCount * 2) - (age * 100);
};

export const searchVideos = async (query: string): Promise<YouTubeVideo[]> => {
  try {
    const response = await fetch(
      `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=25&order=relevance&key=${API_KEY}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to search videos');
    }

    // Get video IDs to fetch their statistics and content details
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const detailsResponse = await fetch(
      `${BASE_URL}/videos?part=statistics,contentDetails&id=${videoIds}&key=${API_KEY}`
    );
    const detailsData = await detailsResponse.json();

    const videoDetails = new Map(
      detailsData.items.map((item: any) => [item.id, item])
    );

    return data.items.map((item: any) => {
      const details = videoDetails.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.high.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
        viewCount: formatViewCount(details?.statistics.viewCount || '0'),
        likeCount: formatViewCount(details?.statistics.likeCount || '0'),
        duration: formatDuration(details?.contentDetails.duration || ''),
        categoryId: item.snippet.categoryId,
      };
    });
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
};

export const fetchWatchHistory = async (): Promise<YouTubeVideo[]> => {
  try {
    // Get current access token
    const tokens = await GoogleSignin.getTokens();
    if (!tokens?.accessToken) {
      throw new Error('YouTube scope not granted. Please sign out and sign in again.');
    }

    // First get the watch history playlist ID
    const historyResponse = await fetch(
      `${BASE_URL}/channels?part=contentDetails&mine=true`,
      // 'https://www.googleapis.com/auth/youtube.readonly',  `${BASE_URL}/channels?part=contentDetails&mine=true`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        },
      }
    );
    
    if (!historyResponse.ok) {
      const error = await historyResponse.json();
      throw new Error(error.error?.message || 'Failed to access YouTube data');
    }

    const historyData = await historyResponse.json();
    const watchHistoryId = historyData.items?.[0]?.contentDetails?.relatedPlaylists?.watchHistory;

    if (!watchHistoryId) {
      throw new Error('Could not access watch history. Please check your YouTube permissions.');
    }

    // Get watch history videos
    const response = await fetch(
      `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${watchHistoryId}&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch watch history');
    }

    const data = await response.json();
    if (!data.items?.length) {
      return []; // Return empty array if no watch history
    }

    // Get video IDs to fetch additional details
    const videoIds = data.items
      .map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) {
      return []; // Return empty array if no valid video IDs
    }

    const detailsResponse = await fetch(
      `${BASE_URL}/videos?part=statistics,contentDetails&id=${videoIds}&key=${API_KEY}`
    );

    if (!detailsResponse.ok) {
      const error = await detailsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch video details');
    }

    const detailsData = await detailsResponse.json();
    const videoDetails = new Map(
      (detailsData.items || []).map((item: any) => [item.id, item])
    );

    // Map and sort by recently watched
    const videos = data.items
      .filter((item: any) => item.snippet && item.contentDetails?.videoId)
      .map((item: any) => {
        const details = videoDetails.get(item.contentDetails.videoId) || {};
        const stats = details.statistics || {};
        const contentDetails = details.contentDetails || {};
        
        return {
          id: item.contentDetails.videoId,
          title: item.snippet.title || 'Untitled',
          description: item.snippet.description || '',
          thumbnail: item.snippet.thumbnails?.high?.url || 
                    item.snippet.thumbnails?.default?.url || 
                    'https://via.placeholder.com/480x360.png?text=No+Thumbnail',
          channelTitle: item.snippet.channelTitle || 'Unknown Channel',
          publishedAt: new Date(item.snippet.publishedAt || Date.now()).toLocaleDateString(),
          viewCount: formatViewCount(stats.viewCount || '0'),
          likeCount: formatViewCount(stats.likeCount || '0'),
          duration: formatDuration(contentDetails.duration || ''),
          categoryId: item.snippet.categoryId || '',
          watchedAt: item.snippet.publishedAt || Date.now(),
        };
      });

    // Sort by most recently watched
    return videos.sort((a: YouTubeVideo, b: YouTubeVideo) => 
      new Date(b.watchedAt!).getTime() - new Date(a.watchedAt!).getTime()
    );
  } catch (error: any) {
    console.error('Error fetching watch history:', error);
    throw new Error(error.message || 'Failed to fetch watch history');
  }
};
