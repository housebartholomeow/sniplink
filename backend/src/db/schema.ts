import { serial, pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

export const urls = pgTable ("urls", {
    id: serial("id").primaryKey(),
    shortCode: text("short_code").notNull(),
    originalURL: text("original_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => {
    // creates a B-tree index on the shortCode column
    return {
        shortCodeIdx: index("short_code_idx").on(table.shortCode),
    };
});