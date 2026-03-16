import { Collection, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import DatabaseConnection from '../config/database.js';
import type {
  UserDocument,
  RegisterDTO,
  ChangePasswordDTO,
} from '../types/user.types.js';

const SALT_ROUNDS = 12;

// ──────────────────────────────────────────────
//  UserModel — toda la lógica de datos del usuario
//  Principio SRP: solo gestiona persistencia/transformación
// ──────────────────────────────────────────────
class UserModel {
  // Record<string, any> evita la colisión con el Document del DOM
  private get collection(): Collection<UserDocument & Record<string, unknown>> {
    return DatabaseConnection.getInstance().getCollection<UserDocument & Record<string, unknown>>('users');
  }

  // ── Crear usuario ──────────────────────────
  async create(dto: RegisterDTO): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const now = new Date();

    const newUser: UserDocument = {
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(newUser as never);
    return { ...newUser, _id: result.insertedId };
  }

  // ── Buscar por email ───────────────────────
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.collection.findOne({ email: email.toLowerCase().trim() }) as Promise<UserDocument | null>;
  }

  // ── Buscar por id ──────────────────────────
  async findById(id: string): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.collection.findOne({ _id: new ObjectId(id) }) as Promise<UserDocument | null>;
  }

  // ── Buscar por token de recuperación ──────
  async findByResetToken(token: string): Promise<UserDocument | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    return this.collection.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }) as Promise<UserDocument | null>;
  }

  // ── Verificar contraseña ───────────────────
  async verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  // ── Generar token de recuperación ─────────
  async generatePasswordResetToken(userId: ObjectId): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.collection.updateOne(
      { _id: userId } as never,
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
          updatedAt: new Date(),
        },
      },
    );

    return rawToken;
  }

  // ── Cambiar contraseña con token ───────────
  async resetPassword(userId: ObjectId, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.collection.updateOne(
      { _id: userId } as never,
      {
        $set: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date(),
        },
      },
    );
  }

  // ── Cambiar contraseña autenticado ─────────
  async changePassword(userId: string, dto: ChangePasswordDTO): Promise<{ success: boolean; message: string }> {
    const user = await this.findById(userId);
    if (!user) return { success: false, message: 'Usuario no encontrado.' };

    const passwordValid = await this.verifyPassword(dto.currentPassword, user.password);
    if (!passwordValid) return { success: false, message: 'La contraseña actual es incorrecta.' };

    const hashedPassword = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.collection.updateOne(
      { _id: new ObjectId(userId) } as never,
      { $set: { password: hashedPassword, updatedAt: new Date() } },
    );

    return { success: true, message: 'Contraseña actualizada correctamente.' };
  }

  // ── Sanitizar usuario para respuestas ─────
  sanitize(user: UserDocument): Omit<UserDocument, 'password' | 'passwordResetToken' | 'passwordResetExpires'> {
    const { password: _p, passwordResetToken: _t, passwordResetExpires: _e, ...safe } = user;
    return safe;
  }
}

export default new UserModel();
