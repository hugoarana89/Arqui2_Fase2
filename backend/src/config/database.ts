import { MongoClient, Db, ServerApiVersion, Collection } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// ──────────────────────────────────────────────
//  Singleton de conexión a MongoDB Atlas
// ──────────────────────────────────────────────
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

    const dbName = process.env['DB_NAME'] ?? 'auth_db';
    this.db = this.client.db(dbName);

    console.log(`✅ Conectado a MongoDB Atlas — base de datos: "${dbName}"`);

    await this.initCollections();
  }

  /**
   * Crea las colecciones con sus validadores (schema) si no existen.
   * Esto garantiza que los campos coincidan sin entrar manualmente a Atlas.
   */
  private async initCollections(): Promise<void> {
    const existingCollections = (await this.db.listCollections().toArray()).map(
      (c) => c.name,
    );

    // ── Colección: users ──────────────────────
    if (!existingCollections.includes('users')) {
      await this.db.createCollection('users', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['name', 'email', 'password', 'createdAt'],
            properties: {
              name: { bsonType: 'string', description: 'Nombre del usuario' },
              email: {
                bsonType: 'string',
                pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
                description: 'Correo electrónico válido y único',
              },
              password: { bsonType: 'string', description: 'Hash bcrypt' },
              passwordResetToken: {
                bsonType: ['string', 'null'],
                description: 'Token para recuperar contraseña',
              },
              passwordResetExpires: {
                bsonType: ['date', 'null'],
                description: 'Expiración del token',
              },
              createdAt: { bsonType: 'date' },
              updatedAt: { bsonType: 'date' },
            },
          },
        },
      });

      // Índice único sobre email
      await this.db
        .collection('users')
        .createIndex({ email: 1 }, { unique: true });

      console.log('📦 Colección "users" creada con validador y índice único.');
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
