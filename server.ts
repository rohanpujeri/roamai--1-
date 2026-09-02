import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { generateTripFromInputs, adaptTripPlanWithAI } from './server/services/aiPlanner';
import { fetchAiRealTripBudget } from './server/services/aiBudgetEstimator';
import { fetchAiDestinationTravelIntelligence } from './server/services/aiDestinationAdvisor';
import { fetchAIAlternativePlaces } from './server/services/alternativePlaces';
import { fetchRealPlacePhoto } from './server/utils/realPlacePhotos';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json({ limit: '10mb' }));

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
      const { destination, startCity } = req.body;
      const intelligence = await fetchAiDestinationTravelIntelligence(destination, startCity);
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
