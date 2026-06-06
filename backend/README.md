# URL Shortener API

## Setup
1. Run `npm install`
2. Provide database URL to `.env ` like in `.env.example`
3. Make sure database exists first in the PostgreSQL server.
4. Run `node migrate.js` to push the schema.
5. Run `node src/index.ts` to start the server.

## Endpoints

### Create Short URL
**POST** `/api/shorten`
**Body:**
{
  "originalURL": "https://example.com"
}
**Response:**
{
  "shortUrl": "http://localhost:3000/a",
  "shortCode": "a",
  "originalURL": "https://example.com"
}
