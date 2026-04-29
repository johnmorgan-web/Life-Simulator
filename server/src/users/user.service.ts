import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from '../game/logic/game.service';
import { GameState } from '../game/types/game.types';
import { UserStateEntity } from './entities/user-state.entity';

const NON_PERSISTED_STATE_KEYS = new Set<string>([
  'jobMarket',
  'realEstateMarket',
  'realEstateMarketMeta',
]);

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
      name: entity.name,
      id: entity.id,
    };
  }

  private toHydratedGameSnapshot(entity: UserStateEntity): Partial<GameState> & { id: string } {
    const hydratedState = this.buildHydratedState(entity.name, entity.state || {});
    return {
      ...hydratedState,
      name: entity.name,
      id: entity.id,
    };
  }

  /**
   * Create a new user with initial game state
   */
  async createUser(name: string): Promise<(Partial<GameState> & { id: string }) | null> {
    const existing = await this.userStateRepository.findOne({ where: { name } });
    if (existing) return this.toGameSnapshot(existing);

    const id = crypto.randomUUID();
    const initialState = this.gameService.getInitialState(name);
    const createdUser = this.userStateRepository.create({
      id,
      name,
      state: this.buildPersistedState(name, initialState),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.userStateRepository.save(createdUser);
    return this.toGameSnapshot(saved);
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
    updateData: Partial<GameState>,
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    if (!user) return null;

    const currentState = this.buildHydratedState(user.name, user.state || {});
    const nextState = {
      ...currentState,
      ...updateData,
      name: user.name,
    };

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