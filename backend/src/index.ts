import express from 'express';
import cors from 'cors'
import { shortenUrl, redirectUrl } from './controllers/url.controller.ts';

const app = express();

app.use(cors())

// Middleware to parse incoming JSON requests
app.use(express.json()); 

// 1. Route to create a new short URL
app.post('/api/shorten', shortenUrl);

// 2. Route to handle the redirect (e.g., localhost:3000/sBc)
app.get('/:shortCode', redirectUrl);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 URL Shortener API is running on http://localhost:${PORT}`);
});