import { MongoClient, Db, ServerApiVersion, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: MongoClient;
  private db!: Db;

  private constructor() {
    const uri = process.env['MONGO_URI'];
    if (!uri) throw new Error('MONGO_URI no está definido en el archivo .env');

    this.client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    await this.client.connect();
    await this.client.db('admin').command({ ping: 1 });

    const dbName = process.env['DB_NAME'] ?? 'ecosort_db';
    this.db = this.client.db(dbName);

    console.log(`✅ Conectado a MongoDB Atlas — base de datos: "${dbName}"`);
    await this.initCollections();
  }

  private async initCollections(): Promise<void> {
    const existing = (await this.db.listCollections().toArray()).map((c) => c.name);

    // ── users ──────────────────────────────────
    if (!existing.includes('users')) {
      await this.db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'password', 'createdAt'],
            properties: {
              name:                 { bsonType: 'string' },
              email:                { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
              password:             { bsonType: 'string' },
              passwordResetToken:   { bsonType: ['string', 'null'] },
              passwordResetExpires: { bsonType: ['date',   'null'] },
              createdAt:            { bsonType: 'date' },
              updatedAt:            { bsonType: 'date' },
            },
          },
        },
      });
      await this.db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('📦 Colección "users" creada.');
    }

    // ── sensor_events ──────────────────────────
    if (!existing.includes('sensor_events')) {
      await this.db.createCollection('sensor_events');
      await this.db.collection('sensor_events').createIndex({ receivedAt: -1 });
      await this.db.collection('sensor_events').createIndex({ category: 1, receivedAt: -1 });
      console.log('📦 Colección "sensor_events" creada.');
    }

    // ── classification_results ─────────────────
    if (!existing.includes('classification_results')) {
      await this.db.createCollection('classification_results');
      await this.db.collection('classification_results').createIndex({ timestamp: -1 });
      await this.db.collection('classification_results').createIndex({ linea: 1, timestamp: -1 });
      console.log('📦 Colección "classification_results" creada.');
    }

    // ── commands_log ───────────────────────────
    if (!existing.includes('commands_log')) {
      await this.db.createCollection('commands_log');
      await this.db.collection('commands_log').createIndex({ sentAt: -1 });
      await this.db.collection('commands_log').createIndex({ userId: 1, sentAt: -1 });
      console.log('📦 Colección "commands_log" creada.');
    }
  }

  getDb(): Db {
    if (!this.db) throw new Error('La base de datos no está inicializada.');
    return this.db;
  }

  getCollection<T extends Record<string, any>>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  async disconnect(): Promise<void> {
    await this.client.close();
    console.log('🔌 Conexión a MongoDB cerrada.');
  }
}

export default DatabaseConnection;
