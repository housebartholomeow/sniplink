import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
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

    // 1. Generate the ID in memory (No database interaction yet)
    const shortCode = generateShortCode(6);

    // 2. Perform a single INSERT operation
    const [insertedRow] = await db.insert(urls).values({
      originalURL,
      shortCode
    }).returning({ shortCode: urls.shortCode });

    // 3. Return success response
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

    // 1. Type Guard: Ensure shortCode is exactly a single string
    if (typeof shortCode !== 'string') {
      return res.status(400).json({ error: "Invalid short code format." });
    }

    // 2. Look up the shortCode (TypeScript now guarantees shortCode is a string!)
    const [urlRecord] = await db
      .select()
      .from(urls)
      .where(eq(urls.shortCode, shortCode))
      .limit(1);

    if (!urlRecord) {
      return res.status(404).json({ error: "URL not found." });
    }

    return res.redirect(urlRecord.originalURL);

  } catch (error) {
    console.error("Error during redirection:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};