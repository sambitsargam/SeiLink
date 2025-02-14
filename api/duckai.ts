import express from 'express';
import bodyParser from 'body-parser';
import twilio from 'twilio';
import { createMarketSentimentPrivateKeyAgent } from './MarketSentimentAgent.ts';
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
let agent;

// Initialize the Market Sentiment Agent
app.post('/initialize', async (req, res) => {
  const { privateKey, openaiApiKey, apiUrl } = req.body;
  try {
    agent = await createMarketSentimentPrivateKeyAgent(privateKey, openaiApiKey, apiUrl);
    res.status(200).send({ message: 'Market Sentiment Agent initialized successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to initialize agent', details: error.message });
  }
});

// Handle incoming WhatsApp messages with Twilio
app.post('/api/whatsapp', async (req, res) => {
  const from = req.body.From;
  const body = req.body.Body;
  try {
    const response = await agent.processMessage({ fromAgentId: from, content: body });
    await twilioClient.messages.create({
      to: from,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      body: response,
    });
    res.json({ success: true, message: 'WhatsApp message sent with agent response.' });
  } catch (error) {
    console.error('Failed to handle WhatsApp message:', error);
    res.status(500).json({ success: false, message: 'Error processing WhatsApp message.' });
  }
});

// Stop the agent
app.post('/stop', (req, res) => {
  if (agent) {
    agent.stop();
    res.status(200).send({ message: 'Market Sentiment Agent stopped' });
  } else {
    res.status(400).send({ error: 'Agent not initialized' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Market Sentiment API with Twilio listening on port ${PORT}`);
});
