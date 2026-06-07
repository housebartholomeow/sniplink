import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { redisClient } from '../db/redis.ts';
import { db } from '../db/db.ts';
import { urls } from '../db/schema.ts';
import { getShortCodeFromKGS } from '../services/kgs.service.ts';
import { publishClickEvent } from '../services/kafka.service.ts';

export const shortenUrl = async (req: Request, res: Response) => {
  try {
    console.log(`Processed by container ID: ${process.env.HOSTNAME}`);
    
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
        shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${existing.shortCode}`,
        shortCode: existing.shortCode,
        originalURL: existing.originalURL
      });
    }

    const shortCode = await getShortCodeFromKGS();

    // inserts original URL and generated short code to make shortened URL
    const [insertedRow] = await db.insert(urls).values({
      originalURL,
      shortCode
    }).returning({ shortCode: urls.shortCode });

    // short URL successfully created
    return res.status(201).json({
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${insertedRow.shortCode}`, 
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

      // Fire the asynchronous event
      publishClickEvent(shortCode, req.get('User-Agent'), req.ip);

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

    // Fire the asynchronous event
    publishClickEvent(shortCode, req.get('User-Agent'), req.ip);

    return res.redirect(urlRecord.originalURL);

  } catch (error) {
    console.error("Error during redirection:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    // Fetch all URLs ordered by newest first
    const allUrls = await db.select().from(urls).orderBy(desc(urls.createdAt));
    
    // Format them to match what the frontend expects
    const formattedUrls = allUrls.map(u => ({
      originalURL: u.originalURL,
      shortCode: u.shortCode,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${u.shortCode}`,
      clicks: u.clicks
    }));

    return res.status(200).json(formattedUrls);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

export const deleteUrl = async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    if (typeof shortCode !== 'string') {
      return res.status(400).json({ error: "Invalid short code format." });
    }

    // 1. Delete the URL from PostgreSQL
    const deletedRecord = await db
      .delete(urls)
      .where(eq(urls.shortCode, shortCode))
      .returning();

    // If returning array is empty, the short code didn't exist in the database
    if (deletedRecord.length === 0) {
      return res.status(404).json({ error: "URL not found." });
    }

    // 2. Invalidate on Write: Explicitly remove the stale key from Redis
    await redisClient.del(`url:${shortCode}`);

    return res.status(200).json({ message: "URL successfully deleted." });

  } catch (error) {
    console.error("Error deleting URL:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};