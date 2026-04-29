import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { GameService } from '../game/logic/game.service';
import { GameState } from '../game/types/game.types';
import { UserStateEntity } from './entities/user-state.entity';

const NON_PERSISTED_STATE_KEYS = new Set<string>([
  'jobMarket',
  'realEstateMarket',
  'realEstateMarketMeta',
]);

const APPEND_ONLY_STATE_KEYS = new Set<string>([
  'logs',
  'eventHistory',
  'careerHistory',
  'credentialHistory',
  'applications',
  'achievementHistory',
  'rewardHistory',
  'subscriptionBadges',
  'vehicleHistory',
]);

const PASSWORD_SALT_ROUNDS = 12;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserStateEntity)
    private readonly userStateRepository: Repository<UserStateEntity>,
    private gameService: GameService,
  ) {}

  private buildHydratedState(name: string, state: Record<string, any> = {}): Partial<GameState> {
    // Rebuild a complete shape from defaults + saved fields so omitted keys still exist at runtime.
    return {
      ...this.gameService.getInitialState(name),
      ...state,
      name,
    };
  }

  private buildPersistedState(name: string, state: Partial<GameState>): Record<string, any> {
    const normalizedState = {
      ...state,
      name,
    } as Record<string, any>;

    const persistedState: Record<string, any> = {};
    for (const [key, value] of Object.entries(normalizedState)) {
      if (NON_PERSISTED_STATE_KEYS.has(key)) continue;
      if (value === undefined) continue;
      persistedState[key] = value;
    }

    return persistedState;
  }

  private toGameSnapshot(entity: UserStateEntity): Partial<GameState> & { id: string } {
    return {
      ...(entity.state || {}),
      username: entity.username,
      name: entity.name,
      id: entity.id,
    };
  }

  private toHydratedGameSnapshot(entity: UserStateEntity): Partial<GameState> & { id: string } {
    const hydratedState = this.buildHydratedState(entity.name, entity.state || {});
    return {
      ...hydratedState,
      username: entity.username,
      name: entity.name,
      id: entity.id,
    };
  }

  /**
   * Create a new user with initial game state
   */
  async createUser(
    username: string,
    name: string,
    password: string,
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const trimmedUsername = String(username || '').trim();
    const trimmedName = String(name || '').trim();
    if (!trimmedUsername) throw new BadRequestException('Username is required');
    if (!trimmedName) throw new BadRequestException('Name is required');
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const existing = await this.userStateRepository.findOne({ where: { username: trimmedUsername } });
    if (existing) throw new ConflictException('User already exists');

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const initialState = this.gameService.getInitialState(trimmedName);
    const createdUser = this.userStateRepository.create({
      id,
      username: trimmedUsername,
      name: trimmedName,
      passwordHash,
      state: this.buildPersistedState(trimmedName, initialState),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.userStateRepository.save(createdUser);
    return this.toGameSnapshot(saved);
  }

  async loginUser(
    username: string,
    password: string,
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const trimmedUsername = String(username || '').trim();
    if (!trimmedUsername) throw new BadRequestException('Username is required');
    if (!password) throw new BadRequestException('Password is required');

    const user = await this.userStateRepository.findOne({ where: { username: trimmedUsername } });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // Backward-compatible upgrade path for legacy users created before password hashing.
    if (!user.passwordHash) {
      user.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
      user.username = user.username || trimmedUsername;
      const upgraded = await this.userStateRepository.save(user);
      return this.toGameSnapshot(upgraded);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.toGameSnapshot(user);
  }

  /**
   * Get user by id
   */
  async getUserById(id: string): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    return user ? this.toGameSnapshot(user) : null;
  }

  /**
   * Update user state
   */
  async updateUser(
    id: string,
    updateData: Partial<GameState> & { _append?: Record<string, any[]> },
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    if (!user) return null;

    const { _append, ...directUpdates } = (updateData || {}) as Record<string, any>;
    const currentState = {
      ...(user.state || {}),
    } as Record<string, any>;
    const nextState: Record<string, any> = {
      ...currentState,
      ...directUpdates,
      name: user.name,
    };

    if (_append && typeof _append === 'object') {
      for (const [key, items] of Object.entries(_append)) {
        if (!APPEND_ONLY_STATE_KEYS.has(key)) continue;
        if (!Array.isArray(items) || items.length === 0) continue;
        const existing = Array.isArray(nextState[key]) ? nextState[key] : [];
        nextState[key] = [...existing, ...items];
      }
    }

    user.state = this.buildPersistedState(user.name, nextState);
    user.updatedAt = new Date();

    const updated = await this.userStateRepository.save(user);
    return this.toGameSnapshot(updated);
  }

  /**
   * Advance one month in the game
   */
  async processMonth(id: string): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    if (!user) return null;

    const hydratedUser = this.toHydratedGameSnapshot(user);
    const newState = await this.gameService.processMonth(hydratedUser as Partial<GameState>);
    return this.updateUser(id, newState);
  }

  /**
   * Apply a game action to user state
   */
  async applyAction(
    id: string,
    action: any,
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    if (!user) return null;

    const hydratedUser = this.toHydratedGameSnapshot(user);
    const newState = await this.gameService.applyAction(
      hydratedUser as Partial<GameState>,
      action,
    );
    return this.updateUser(id, newState);
  }

  /**
   * List all users
   */
  async listAllUsers(): Promise<Array<Partial<GameState> & { id: string }>> {
    const users = await this.userStateRepository.find({ order: { updatedAt: 'DESC' } });
    return users.map((user) => this.toGameSnapshot(user));
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await this.userStateRepository.delete({ id });
    return Number(result.affected || 0) > 0;
  }
}