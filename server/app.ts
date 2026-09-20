import express from 'express';
import path from 'path';
import dotenv from 'dotenv';

import { generateTripFromInputs, adaptTripPlanWithAI, generateRealPlaceForDay } from './services/serverPlanner';
import { fetchAiRealTripBudget } from './services/serverBudgetEstimator';
import { fetchAiDestinationTravelIntelligence } from './services/serverDestinationAdvisor';
import { fetchAIAlternativePlaces } from './services/serverAlternativePlaces';
import { fetchRealPlacePhoto } from './utils/realPlacePhotos';
import { fetchAiHotelSuggestions } from './services/serverHotelAdvisor';
import { fetchNearbyPlaces } from './services/serverNearbyPlaces';
import { reverseGeocodeCoordinates, detectLocationFromIp } from './services/serverLocationDetector';
import { fetchAiThemePreviewTrip } from './services/serverDestinationInspiration';
import { isUsernameAvailable, registerServerUsername, searchServerUsers } from './services/serverUsernameRegistry';
import { 
  getAllServerTrails, 
  saveServerTrail, 
  deleteServerTrail, 
  toggleLikeServerTrail, 
  getServerTrailLikers,
  addCommentToServerTrail 
} from './services/serverTrailsRegistry';
import {
  getAllServerFollows,
  getServerFollowCounts,
  isServerUserFollowing,
  getServerFollowers,
  getServerFollowing,
  followServerUser,
  unfollowServerUser,
  toggleServerFollow,
  removeServerFollower
} from './services/serverFollowsRegistry';

dotenv.config();

export function createExpressApp() {
  const app = express();

  // Enable CORS headers for cross-origin or serverless API requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static alias for case-insensitive image access
  app.use('/Images', express.static(path.join(process.cwd(), 'public/images')));
  app.use('/images', express.static(path.join(process.cwd(), 'public/images')));

  // Static uploads for user trail videos and photos
  app.use('/uploads/trails', express.static(path.join(process.cwd(), 'public/uploads/trails')));
  app.use('/Uploads/trails', express.static(path.join(process.cwd(), 'public/uploads/trails')));
  app.use('/uploads/trails', express.static('/tmp/roamai_uploads'));

  // Create modular API Router
  const apiRouter = express.Router();

  // Health check endpoint
  apiRouter.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)
    });
  });

  // Generate complete trip itinerary
  apiRouter.post('/ai/generate-trip', async (req, res) => {
    try {
      const trip = await generateTripFromInputs(req.body);
      res.json(trip);
    } catch (err: any) {
      console.error('AI Generation endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate trip' });
    }
  });

  // Adapt existing trip
  apiRouter.post('/ai/adapt-trip', async (req, res) => {
    try {
      const { trip, triggerId, targetDayNumber } = req.body;
      const result = await adaptTripPlanWithAI(trip, triggerId, targetDayNumber);
      res.json(result);
    } catch (err: any) {
      console.error('AI Adapt endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to adapt trip' });
    }
  });

  // Estimate realistic travel budget
  apiRouter.post('/ai/estimate-budget', async (req, res) => {
    try {
      const budget = await fetchAiRealTripBudget(req.body);
      res.json(budget);
    } catch (err: any) {
      console.error('AI Budget endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to estimate budget' });
    }
  });

  // Destination travel logistics & advice
  apiRouter.post('/ai/destination-advice', async (req, res) => {
    try {
      const { destination, startCity, travelMode } = req.body;
      const intelligence = await fetchAiDestinationTravelIntelligence(destination, startCity, travelMode);
      res.json(intelligence);
    } catch (err: any) {
      console.error('AI Destination Advice error:', err);
      res.status(500).json({ error: err.message || 'Failed to get destination advice' });
    }
  });

  // Alternative place options
  apiRouter.post('/ai/alternative-places', async (req, res) => {
    try {
      const { destination, currentActivity, userStyles } = req.body;
      const alternatives = await fetchAIAlternativePlaces(destination, currentActivity, userStyles);
      res.json(alternatives);
    } catch (err: any) {
      console.error('AI Alternative Places error:', err);
      res.status(500).json({ error: err.message || 'Failed to find alternative places' });
    }
  });

  // Nearby place recommendations
  apiRouter.post('/ai/nearby-places', async (req, res) => {
    try {
      const recommendations = await fetchNearbyPlaces(req.body);
      res.json(recommendations);
    } catch (err: any) {
      console.error('AI Nearby Places error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch nearby recommendations' });
    }
  });

  // Add real verified place to day
  apiRouter.post('/ai/add-real-place', async (req, res) => {
    try {
      const newActivity = await generateRealPlaceForDay(req.body);
      res.json(newActivity);
    } catch (err: any) {
      console.error('AI Add Real Place error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate real place' });
    }
  });

  // Hotel & accommodation recommendations
  apiRouter.post('/ai/suggest-hotels', async (req, res) => {
    try {
      const hotels = await fetchAiHotelSuggestions(req.body);
      res.json(hotels);
    } catch (err: any) {
      console.error('AI Hotel Advisor error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch hotel recommendations' });
    }
  });

  // Theme preview trip
  apiRouter.post('/ai/theme-preview', async (req, res) => {
    try {
      const { themeId, themeName, themeVibe } = req.body;
      const preview = await fetchAiThemePreviewTrip(themeId, themeName, themeVibe);
      res.json(preview);
    } catch (err: any) {
      console.error('AI Theme Preview error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch theme preview' });
    }
  });

  // Real place photos
  apiRouter.get('/places/real-photo', async (req, res) => {
    try {
      const title = (req.query.title as string) || '';
      const destination = (req.query.destination as string) || '';
      const category = (req.query.category as string) || '';
      const photoUrl = await fetchRealPlacePhoto(title, destination, category);
      res.json({ photoUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch place photo' });
    }
  });

  // Reverse geocode location
  apiRouter.get('/detect-location/reverse', async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
        return;
      }

      const result = await reverseGeocodeCoordinates(lat, lng);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Unable to reverse geocode coordinates' });
      }
    } catch (err: any) {
      console.error('Location reverse geocode error:', err);
      res.status(500).json({ error: err.message || 'Reverse geocode failed' });
    }
  });

  // Detect location from IP
  apiRouter.get('/detect-location/ip', async (req, res) => {
    try {
      const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      const clientIp = rawIp.split(',')[0].trim();
      const result = await detectLocationFromIp(clientIp);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: 'Could not detect location from IP' });
      }
    } catch (err: any) {
      console.error('IP location detection error:', err);
      res.status(500).json({ error: err.message || 'IP location detection failed' });
    }
  });

  // Check username uniqueness & format
  apiRouter.get('/auth/check-username', async (req, res) => {
    const username = (req.query.username as string) || '';
    const userId = (req.query.userId as string) || undefined;
    const result = await isUsernameAvailable(username, userId);
    res.json(result);
  });

  // Claim/register a username
  apiRouter.post('/auth/register-username', async (req, res) => {
    const { username, userId, email } = req.body;
    const result = await registerServerUsername(username, userId, email);
    if (!result.success) {
      res.status(409).json(result);
      return;
    }
    res.json(result);
  });

  // Search real registered users
  apiRouter.get('/auth/search-users', (req, res) => {
    const q = (req.query.q as string) || '';
    const users = searchServerUsers(q);
    res.json({ users });
  });

  // Get all global shared trails across all profiles
  apiRouter.get('/trails', (req, res) => {
    try {
      const trails = getAllServerTrails();
      res.json({ trails });
    } catch (err: any) {
      console.error('Error fetching trails:', err);
      res.status(500).json({ error: 'Failed to fetch trails' });
    }
  });

  // Upload and publish a shared trail
  apiRouter.post('/trails', (req, res) => {
    try {
      const { trail, mediaDataUrl, posterDataUrl } = req.body;
      if (!trail || !trail.id) {
        res.status(400).json({ error: 'Trail data with an id is required' });
        return;
      }
      const saved = saveServerTrail(trail, mediaDataUrl, posterDataUrl);
      res.json({ success: true, trail: saved });
    } catch (err: any) {
      console.error('Error saving trail:', err);
      res.status(500).json({ error: 'Failed to save trail' });
    }
  });

  // Delete a shared trail
  apiRouter.delete('/trails/:id', (req, res) => {
    try {
      const { id } = req.params;
      const success = deleteServerTrail(id);
      res.json({ success });
    } catch (err: any) {
      console.error('Error deleting trail:', err);
      res.status(500).json({ error: 'Failed to delete trail' });
    }
  });

  // Like or unlike a trail
  apiRouter.post('/trails/:id/like', (req, res) => {
    try {
      const { id } = req.params;
      const { increment, liker } = req.body;
      const result = toggleLikeServerTrail(id, increment !== false, liker);
      res.json(result);
    } catch (err: any) {
      console.error('Error liking trail:', err);
      res.status(500).json({ error: 'Failed to update like status' });
    }
  });

  // Get users who liked a trail
  apiRouter.get('/trails/:id/likes', (req, res) => {
    try {
      const { id } = req.params;
      const likers = getServerTrailLikers(id);
      res.json({ likers });
    } catch (err: any) {
      console.error('Error fetching trail likers:', err);
      res.status(500).json({ error: 'Failed to fetch likers' });
    }
  });

  // Add comment to a trail
  apiRouter.post('/trails/:id/comment', (req, res) => {
    try {
      const { id } = req.params;
      const { user, avatar, text } = req.body;
      if (!text) {
        res.status(400).json({ error: 'Comment text is required' });
        return;
      }
      const success = addCommentToServerTrail(id, { user: user || 'Traveler', avatar: avatar || '', text });
      res.json({ success });
    } catch (err: any) {
      console.error('Error adding comment:', err);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  });

  // Get all follow relationships
  apiRouter.get('/follows', (_req, res) => {
    try {
      const follows = getAllServerFollows();
      res.json({ follows });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch follows' });
    }
  });

  // Get followers and following counts
  apiRouter.get('/follows/counts', (req, res) => {
    try {
      const identifier = (req.query.identifier as string) || '';
      const counts = getServerFollowCounts(identifier);
      res.json(counts);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch follow counts' });
    }
  });

  // Get list of followers
  apiRouter.get('/follows/followers', (req, res) => {
    try {
      const identifier = (req.query.identifier as string) || '';
      const followers = getServerFollowers(identifier);
      res.json({ followers });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch followers' });
    }
  });

  // Get list of following
  apiRouter.get('/follows/following', (req, res) => {
    try {
      const identifier = (req.query.identifier as string) || '';
      const following = getServerFollowing(identifier);
      res.json({ following });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch following' });
    }
  });

  // Follow a user
  apiRouter.post('/follows/follow', (req, res) => {
    try {
      const { follower, target } = req.body;
      if (!follower || !target) {
        res.status(400).json({ error: 'follower and target objects are required' });
        return;
      }
      const record = followServerUser(follower, target);
      res.json({ success: !!record, record });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to follow user' });
    }
  });

  // Unfollow a user
  apiRouter.post('/follows/unfollow', (req, res) => {
    try {
      const { follower, target } = req.body;
      if (!follower || !target) {
        res.status(400).json({ error: 'follower and target objects are required' });
        return;
      }
      const success = unfollowServerUser(follower, target);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to unfollow user' });
    }
  });

  // Toggle follow status
  apiRouter.post('/follows/toggle', (req, res) => {
    try {
      const { follower, target } = req.body;
      if (!follower || !target) {
        res.status(400).json({ error: 'follower and target objects are required' });
        return;
      }
      const result = toggleServerFollow(follower, target);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to toggle follow' });
    }
  });

  // Remove a follower
  apiRouter.post('/follows/remove-follower', (req, res) => {
    try {
      const { currentUser, targetFollower } = req.body;
      if (!currentUser || !targetFollower) {
        res.status(400).json({ error: 'currentUser and targetFollower are required' });
        return;
      }
      const success = removeServerFollower(currentUser, targetFollower);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove follower' });
    }
  });

  // Mount router at both /api and / to ensure compatibility with Vercel rewrites and standalone Node server
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  return app;
}

export const app = createExpressApp();
export default app;

