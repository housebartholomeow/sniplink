import { Kafka } from 'kafkajs';

const kafka = new Kafka({
  clientId: 'sniplink-api',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: 'analytics-group' });

export const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('✅ Connected to Kafka Producer');

    await consumer.connect();
    console.log('✅ Connected to Kafka Consumer');

    // Subscribe the consumer to our analytics topic
    await consumer.subscribe({ topic: 'link-clicks', fromBeginning: true });

    // Start listening for events in the background
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        if (message.value) {
          const eventData = JSON.parse(message.value.toString());
          // In the future, this is where you execute the Drizzle ORM insert/update
          // to update the click count in PostgreSQL.
          console.log(`📊 [Analytics Processed] Click registered for: ${eventData.shortCode}`);
        }
      },
    });
  } catch (error) {
    console.error('❌ Kafka Connection Error:', error);
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