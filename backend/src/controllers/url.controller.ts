import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { db } from '../db/db.ts';
import { urls } from '../db/schema.ts';
import { encodeId } from '../utils/base62.ts';

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

    // 3. Insert, Encode, and Update using a Transaction
    const finalUrl = await db.transaction(async (tx) => {
      // Step A: Insert with a temporary unique string to satisfy the `.notNull()` constraint
      const tempCode = `temp_${crypto.randomUUID()}`;
      
      const [insertedRow] = await tx.insert(urls).values({
        originalURL,
        shortCode: tempCode
      }).returning({ id: urls.id });

      // Step B: Encode the auto-incremented ID
      const generatedShortCode = encodeId(insertedRow.id);

      // Step C: Update the row with the actual Base62 short code
      const [updatedRow] = await tx.update(urls)
        .set({ shortCode: generatedShortCode })
        .where(eq(urls.id, insertedRow.id))
        .returning({ shortCode: urls.shortCode });

      return updatedRow;
    });

    // 4. Return success response
    return res.status(201).json({
      shortUrl: `http://localhost:3000/${finalUrl.shortCode}`, // Replace with your actual domain
      shortCode: finalUrl.shortCode,
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