import express from 'express';
import dotenv from 'dotenv';
import { generateTripFromInputs, adaptTripPlanWithAI } from './services/aiPlanner';
import { fetchAiRealTripBudget } from './services/aiBudgetEstimator';
import { fetchAiDestinationTravelIntelligence } from './services/aiDestinationAdvisor';
import { fetchAIAlternativePlaces } from './services/alternativePlaces';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/api/ai/generate-trip', async (req, res) => {
  try {
    const trip = await generateTripFromInputs(req.body);
    res.json(trip);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/adapt-trip', async (req, res) => {
  try {
    const { trip, triggerId, targetDayNumber } = req.body;
    const result = await adaptTripPlanWithAI(trip, triggerId, targetDayNumber);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/estimate-budget', async (req, res) => {
  try {
    const budget = await fetchAiRealTripBudget(req.body);
    res.json(budget);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/destination-advice', async (req, res) => {
  try {
    const { destination, startCity } = req.body;
    const intelligence = await fetchAiDestinationTravelIntelligence(destination, startCity);
    res.json(intelligence);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/alternative-places', async (req, res) => {
  try {
    const { destination, currentActivity, userStyles } = req.body;
    const alternatives = await fetchAIAlternativePlaces(destination, currentActivity, userStyles);
    res.json(alternatives);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
