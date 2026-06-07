import { Kafka } from 'kafkajs';
import { db } from '../db/db.ts';
import { urls } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';

const kafka = new Kafka({
  clientId: 'sniplink-api',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'analytics-group' });

export const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('Connected to Kafka Producer');

    await consumer.connect();
    console.log('Connected to Kafka Consumer');

    // Subscribe the consumer to our analytics topic
    await consumer.subscribe({ topic: 'link-clicks', fromBeginning: true });

    // Start listening for events in the background
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (message.value) {
          const eventData = JSON.parse(message.value.toString());
          
          try {
            // Execute the Drizzle ORM update to increment the click count
            await db.update(urls)
              .set({ clicks: sql`${urls.clicks} + 1` })
              .where(eq(urls.shortCode, eventData.shortCode));
              
            console.log(`[Analytics Processed] Click registered for: ${eventData.shortCode}`);
          } catch (dbError) {
            console.error('Error updating clicks in database:', dbError);
          }
        }
      },
    });
  } catch (error) {
    console.error('Kafka Connection Error:', error);
  }
};

// Helper function for fire-and-forget publishing
export const publishClickEvent = (shortCode: string, userAgent?: string, ip?: string) => {
  const eventPayload = {
    shortCode,
    timestamp: new Date().toISOString(),
    userAgent,
    ip
  };

  producer.send({
    topic: 'link-clicks',
    messages: [{ value: JSON.stringify(eventPayload) }],
  }).catch(err => {
    console.error('Failed to publish click event:', err);
  });
};