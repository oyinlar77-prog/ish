import {
  pgTable,
  serial,
  text,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const providerEnum = pgEnum("provider", ["groq", "openai", "anthropic", "gemini"]);

export const apiConfigsTable = pgTable("api_configs", {
  id: serial("id").primaryKey(),
  feature: text("feature").notNull(),
  provider: providerEnum("provider").notNull(),
  model: text("model").notNull(),
  apiKey: text("api_key"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertApiConfigSchema = createInsertSchema(apiConfigsTable).omit({
  id: true,
});
export type InsertApiConfig = z.infer<typeof insertApiConfigSchema>;
export type ApiConfig = typeof apiConfigsTable.$inferSelect;
