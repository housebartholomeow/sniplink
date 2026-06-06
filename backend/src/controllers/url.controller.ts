import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { redisClient } from '../db/redis.ts';
import { db } from '../db/db.ts';
import { urls } from '../db/schema.ts';
import { generateShortCode } from '../utils/base62.ts';

export const shortenUrl = async (req: Request, res: Response) => {
  try {
    const { originalURL } = req.body;

    if (!originalURL || typeof originalURL !== 'string') {
      return res.status(400).json({ error: "Invalid URL provided." });
    }

    try {
      new URL(originalURL);
    } catch (_) {
      return res.status(400).json({ error: "Invalid URL format." });
    }

    const [existing] = await db.select().from(urls).where(eq(urls.originalURL, originalURL)).limit(1);
    if (existing) {
      return res.status(200).json({
        shortUrl: `http://localhost:3000/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalURL: existing.originalURL
      });
    }

    // in-memory ID
    const shortCode = generateShortCode(6);

    // inserts original URL and generated short code to make shortened URL
    const [insertedRow] = await db.insert(urls).values({
      originalURL,
      shortCode
    }).returning({ shortCode: urls.shortCode });

    // short URL successfully created
    return res.status(201).json({
      shortUrl: `http://localhost:3000/${insertedRow.shortCode}`, 
      shortCode: insertedRow.shortCode,
      originalURL
    });

  } catch (error) {
    console.error("Error generating short URL:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const redirectUrl = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params; // or req.query, depending on your setup

    if (shortCode === 'favicon.ico') {
      return res.status(204).end(); 
    }

    // ensures shortCode is exactly a single string
    if (typeof shortCode !== 'string') {
      return res.status(400).json({ error: "Invalid short code format." });
    }

    console.time(`LookupTime-${shortCode}`);

    // checks Redis using cache-aside pattern
    const cachedUrl = await redisClient.get(`url:${shortCode}`);
    if (cachedUrl) {
      console.log("Cache Hit.")
      console.timeEnd(`LookupTime-${shortCode}`);
      return res.redirect(cachedUrl);
    }
    
    // looks in database if cache miss
    console.log("Cache miss-fetching from database.")
    const [urlRecord] = await db
      .select()
      .from(urls)
      .where(eq(urls.shortCode, shortCode))
      .limit(1);

    if (!urlRecord) {
      console.timeEnd(`LookupTime-${shortCode}`);
      return res.status(404).json({ error: "URL not found." });
    }

    await redisClient.setEx(`url:${shortCode}`, 86400, urlRecord.originalURL);

    console.timeEnd(`LookupTime-${shortCode}`);
    return res.redirect(urlRecord.originalURL);

  } catch (error) {
    console.error("Error during redirection:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};