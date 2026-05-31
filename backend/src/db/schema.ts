import { serial, pgTable, text, timestamp} from "drizzle-orm/pg-core"

export const urls = pgTable ("urls", {
    id: serial("id").primaryKey(),
    shortCode: text("short_code").notNull(),
    originalURL: text("original_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
})