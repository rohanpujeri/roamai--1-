import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { generateTripFromInputs, adaptTripPlanWithAI, generateRealPlaceForDay } from './server/services/serverPlanner';
import { fetchAiRealTripBudget } from './server/services/serverBudgetEstimator';
import { fetchAiDestinationTravelIntelligence } from './server/services/serverDestinationAdvisor';
import { fetchAIAlternativePlaces } from './server/services/serverAlternativePlaces';
import { fetchRealPlacePhoto } from './server/utils/realPlacePhotos';
import { fetchAiHotelSuggestions } from './server/services/serverHotelAdvisor';
import { fetchNearbyPlaces } from './server/services/serverNearbyPlaces';
import { reverseGeocodeCoordinates, detectLocationFromIp } from './server/services/serverLocationDetector';
import { fetchAiThemePreviewTrip } from './server/services/serverDestinationInspiration';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Static alias for case-insensitive image access
  app.use('/Images', express.static(path.join(process.cwd(), 'public/images')));
  app.use('/images', express.static(path.join(process.cwd(), 'public/images')));

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/ai/generate-trip', async (req, res) => {
    try {
      const trip = await generateTripFromInputs(req.body);
      res.json(trip);
    } catch (err: any) {
      console.error('AI Generation endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate trip' });
    }
  });

  app.post('/api/ai/adapt-trip', async (req, res) => {
    try {
      const { trip, triggerId, targetDayNumber } = req.body;
      const result = await adaptTripPlanWithAI(trip, triggerId, targetDayNumber);
      res.json(result);
    } catch (err: any) {
      console.error('AI Adapt endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to adapt trip' });
    }
  });

  app.post('/api/ai/estimate-budget', async (req, res) => {
    try {
      const budget = await fetchAiRealTripBudget(req.body);
      res.json(budget);
    } catch (err: any) {
      console.error('AI Budget endpoint error:', err);
      res.status(500).json({ error: err.message || 'Failed to estimate budget' });
    }
  });

  app.post('/api/ai/destination-advice', async (req, res) => {
    try {
      const { destination, startCity, travelMode } = req.body;
      const intelligence = await fetchAiDestinationTravelIntelligence(destination, startCity, travelMode);
      res.json(intelligence);
    } catch (err: any) {
      console.error('AI Destination Advice error:', err);
      res.status(500).json({ error: err.message || 'Failed to get destination advice' });
    }
  });

  app.post('/api/ai/alternative-places', async (req, res) => {
    try {
      const { destination, currentActivity, userStyles } = req.body;
      const alternatives = await fetchAIAlternativePlaces(destination, currentActivity, userStyles);
      res.json(alternatives);
    } catch (err: any) {
      console.error('AI Alternative Places error:', err);
      res.status(500).json({ error: err.message || 'Failed to find alternative places' });
    }
  });

  app.post('/api/ai/nearby-places', async (req, res) => {
    try {
      const recommendations = await fetchNearbyPlaces(req.body);
      res.json(recommendations);
    } catch (err: any) {
      console.error('AI Nearby Places error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch nearby recommendations' });
    }
  });

  app.post('/api/ai/add-real-place', async (req, res) => {
    try {
      const newActivity = await generateRealPlaceForDay(req.body);
      res.json(newActivity);
    } catch (err: any) {
      console.error('AI Add Real Place error:', err);
      res.status(500).json({ error: err.message || 'Failed to generate real place' });
    }
  });

  app.post('/api/ai/suggest-hotels', async (req, res) => {
    try {
      const hotels = await fetchAiHotelSuggestions(req.body);
      res.json(hotels);
    } catch (err: any) {
      console.error('AI Hotel Advisor error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch hotel recommendations' });
    }
  });

  app.post('/api/ai/theme-preview', async (req, res) => {
    try {
      const { themeId, themeName, themeVibe } = req.body;
      const preview = await fetchAiThemePreviewTrip(themeId, themeName, themeVibe);
      res.json(preview);
    } catch (err: any) {
      console.error('AI Theme Preview error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch theme preview' });
    }
  });

  app.get('/api/places/real-photo', async (req, res) => {
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

  // Reverse geocoding endpoint with multi-provider fallback (Google, compliant Nominatim, BigDataCloud)
  app.get('/api/detect-location/reverse', async (req, res) => {
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

  // IP-based location fallback when GPS/browser permission is unavailable
  app.get('/api/detect-location/ip', async (req, res) => {
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
