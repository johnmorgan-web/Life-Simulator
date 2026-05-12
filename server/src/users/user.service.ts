import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
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
const PASSWORD_COMPLEXITY_REGEX = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const USERNAME_CREATE_REGEX = /^[A-Za-z0-9]+$/;
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

@Injectable()
export class UserService implements OnModuleInit {
  private readonly authSessions = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    @InjectRepository(UserStateEntity)
    private readonly userStateRepository: Repository<UserStateEntity>,
    private gameService: GameService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUserOnStartup();
  }

  private async ensureAdminUserOnStartup() {
    const adminCount = await this.userStateRepository.count({ where: { isAdmin: true } });
    if (adminCount > 0) return;

    const [firstUser] = await this.userStateRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });

    if (!firstUser) return;

    firstUser.isAdmin = true;
    await this.userStateRepository.save(firstUser);
  }

  private issueSession(userId: string): string {
    const token = `${crypto.randomUUID()}.${crypto.randomUUID().replace(/-/g, '')}`;
    this.authSessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
    return token;
  }

  private parseBearerToken(authorization?: string): string {
    const header = String(authorization || '');
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing or invalid authorization token');
    }
    return token;
  }

  private async getAuthenticatedUser(authorization?: string): Promise<UserStateEntity> {
    const token = this.parseBearerToken(authorization);
    const session = this.authSessions.get(token);
    if (!session) throw new UnauthorizedException('Invalid session');

    if (session.expiresAt <= Date.now()) {
      this.authSessions.delete(token);
      throw new UnauthorizedException('Session expired');
    }

    const user = await this.userStateRepository.findOne({ where: { id: session.userId } });
    if (!user) {
      this.authSessions.delete(token);
      throw new UnauthorizedException('Session is no longer valid');
    }

    return user;
  }

  private async assertAdminSession(authorization?: string): Promise<UserStateEntity> {
    const user = await this.getAuthenticatedUser(authorization);
    if (!user.isAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }
    return user;
  }

  private buildHydratedState(
    state: Record<string, any> = {},
    usernameFallback?: string | null,
  ): Partial<GameState> {
    const { name: _legacyName, ...stateWithoutName } = state;
    const resolvedName = String(
      stateWithoutName.username
      || stateWithoutName.currentUser
      || usernameFallback
      || 'Player',
    );
    // Rebuild a complete shape from defaults + saved fields so omitted keys still exist at runtime.
    return {
      ...this.gameService.getInitialState(),
      ...stateWithoutName,
      name: resolvedName,
    };
  }

  private buildPersistedState(state: Partial<GameState>): Record<string, any> {
    const normalizedState = {
      ...state,
    } as Record<string, any>;

    const persistedState: Record<string, any> = {};
    for (const [key, value] of Object.entries(normalizedState)) {
      if (NON_PERSISTED_STATE_KEYS.has(key)) continue;
      if (key === 'name') continue;
      if (value === undefined) continue;
      persistedState[key] = value;
    }

    return persistedState;
  }

  private toGameSnapshot(entity: UserStateEntity, authToken?: string): Partial<GameState> & { id: string } {
    const resolvedName = String(entity.username || (entity.state as any)?.currentUser || 'Player');
    const snapshot: Partial<GameState> & { id: string } = {
      ...(entity.state || {}),
      username: entity.username,
      name: resolvedName,
      id: entity.id,
      isAdmin: Boolean(entity.isAdmin),
    };

    if (authToken) {
      snapshot.authToken = authToken;
    }

    return snapshot;
  }

  private toHydratedGameSnapshot(entity: UserStateEntity): Partial<GameState> & { id: string } {
    const hydratedState = this.buildHydratedState(entity.state || {}, entity.username);
    return {
      ...hydratedState,
      username: entity.username,
      name: String((hydratedState as any).name || entity.username || 'Player'),
      id: entity.id,
      isAdmin: Boolean(entity.isAdmin),
    };
  }

  private toAdminUserSummary(entity: UserStateEntity, isPrimaryAdminLocked = false) {
    const state = entity.state || {};
    const credentials = Array.isArray((state as any).credentials) ? (state as any).credentials : [];
    const educationPriority = ['PhD', 'Masters Degree', 'Bachelors Degree', 'Trade Cert', 'HS Diploma'];
    const educationLevel = educationPriority.find((label) => credentials.includes(label)) || 'No Degree';
    const checking = Number(state.check || 0);
    const savings = Number(state.savings || 0);
    const debt = Number(state.debt || 0);
    const stockValue = Array.isArray((state as any).portfolio)
      ? (state as any).portfolio.reduce((sum: number, holding: any) => {
          const ticker = String(holding?.ticker || '');
          const shares = Number(holding?.shares || 0);
          const prices = (state as any).marketPrices || {};
          const price = Number(prices[ticker] || 0);
          if (!Number.isFinite(shares) || !Number.isFinite(price)) return sum;
          return sum + (shares * price);
        }, 0)
      : 0;
    const netWorth = Math.round((checking + savings + stockValue - debt) * 100) / 100;

    return {
      id: entity.id,
      username: entity.username,
      name: String(entity.username || (state as any).currentUser || 'Player'),
      isAdmin: Boolean(entity.isAdmin),
      isPrimaryAdminLocked,
      createdAt: entity.createdAt,
      balances: {
        checking,
        savings,
        debt,
      },
      progression: {
        month: Number((state as any).month || 0),
        year: Number((state as any).year || 0),
        tenureMonths: Number((state as any).tenure || 0),
        jobTitle: String((state as any).job?.title || 'Unemployed'),
        jobBase: Number((state as any).job?.base || 0),
        educationLevel,
        credentialsCount: credentials.length,
        activeEducation: (state as any).activeEdu ? String((state as any).activeEdu) : null,
        transitLevel: Number((state as any).transit?.level || 0),
        creditScore: Number((state as any).credit || 0),
        happiness: Number((state as any).happiness || 0),
        netWorth,
      },
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Create a new user with initial game state
   */
  async createUser(
    username: string,
    password: string,
  ): Promise<(Partial<GameState> & { id: string }) | null> {
    const trimmedUsername = String(username || '').trim();
    if (!trimmedUsername) throw new BadRequestException('Username is required');
    if (!USERNAME_CREATE_REGEX.test(trimmedUsername)) {
      throw new BadRequestException('Username is invalid. Use letters and numbers only (A-Z, a-z, 0-9), with no spaces or special characters');
    }
    if (!password || !PASSWORD_COMPLEXITY_REGEX.test(password)) {
      throw new BadRequestException('Password must be at least 8 characters and include 1 number and 1 symbol');
    }

    const existing = await this.userStateRepository.findOne({ where: { username: trimmedUsername } });
    if (existing) throw new ConflictException('User already exists');

    const existingUsersCount = await this.userStateRepository.count();
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    const initialState = this.gameService.getInitialState();
    const createdUser = this.userStateRepository.create({
      id,
      username: trimmedUsername,
      passwordHash,
      isAdmin: existingUsersCount === 0,
      state: this.buildPersistedState(initialState),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.userStateRepository.save(createdUser);
    const authToken = this.issueSession(saved.id);
    return this.toGameSnapshot(saved, authToken);
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

    const authToken = this.issueSession(user.id);
    return this.toGameSnapshot(user, authToken);
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
    };

    if (_append && typeof _append === 'object') {
      for (const [key, items] of Object.entries(_append)) {
        if (!APPEND_ONLY_STATE_KEYS.has(key)) continue;
        if (!Array.isArray(items) || items.length === 0) continue;
        const existing = Array.isArray(nextState[key]) ? nextState[key] : [];
        nextState[key] = [...existing, ...items];
      }
    }

    user.state = this.buildPersistedState(nextState);
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

  async listUsersForAdmin(authorization?: string): Promise<Array<ReturnType<UserService['toAdminUserSummary']>>> {
    await this.assertAdminSession(authorization);
    const users = await this.userStateRepository.find({ order: { createdAt: 'ASC' } });
    const [firstUser] = await this.userStateRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const firstUserId = firstUser?.id || null;
    return users.map((user) => this.toAdminUserSummary(user, user.id === firstUserId));
  }

  async adminUpdateUser(
    authorization: string | undefined,
    targetUserId: string,
    changes: {
      checking?: number;
      savings?: number;
      debt?: number;
      isAdmin?: boolean;
      username?: string;
      password?: string;
    },
  ) {
    await this.assertAdminSession(authorization);

    const normalizedTargetId = String(targetUserId || '').trim();
    if (!normalizedTargetId) throw new BadRequestException('Target user id is required');

    const user = await this.userStateRepository.findOne({ where: { id: normalizedTargetId } });
    if (!user) throw new BadRequestException('Target user not found');

    const [firstUser] = await this.userStateRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const firstUserId = firstUser?.id || null;

    const nextState = { ...(user.state || {}) } as Record<string, any>;
    if (changes.checking !== undefined) {
      const checking = Number(changes.checking);
      if (!Number.isFinite(checking)) throw new BadRequestException('Invalid checking value');
      nextState.check = checking;
    }
    if (changes.savings !== undefined) {
      const savings = Number(changes.savings);
      if (!Number.isFinite(savings)) throw new BadRequestException('Invalid savings value');
      nextState.savings = savings;
    }
    if (changes.debt !== undefined) {
      const debt = Number(changes.debt);
      if (!Number.isFinite(debt)) throw new BadRequestException('Invalid debt value');
      nextState.debt = debt;
    }
    if (changes.isAdmin !== undefined) {
      const nextIsAdmin = Boolean(changes.isAdmin);
      if (user.id === firstUserId && !nextIsAdmin) {
        throw new ForbiddenException('The first user in the database must remain an admin');
      }
      if (user.isAdmin && !nextIsAdmin) {
        const adminCount = await this.userStateRepository.count({ where: { isAdmin: true } });
        if (adminCount <= 1) {
          throw new ForbiddenException('Cannot remove the last admin');
        }
      }
      user.isAdmin = nextIsAdmin;
    }

    if (changes.username !== undefined) {
      const username = String(changes.username || '').trim();
      if (!username) throw new BadRequestException('Username is required');

      const usernameOwner = await this.userStateRepository.findOne({ where: { username } });
      if (usernameOwner && usernameOwner.id !== user.id) {
        throw new ConflictException('Username is already taken');
      }

      user.username = username;
    }

    if (changes.password !== undefined) {
      const password = String(changes.password || '');
      if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
        throw new BadRequestException('Password must be at least 8 characters and include 1 number and 1 symbol');
      }
      user.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    }

    user.state = this.buildPersistedState(nextState);
    user.updatedAt = new Date();
    const saved = await this.userStateRepository.save(user);
    return this.toAdminUserSummary(saved);
  }

  async adminDeleteUser(authorization: string | undefined, targetUserId: string): Promise<boolean> {
    const actingUser = await this.assertAdminSession(authorization);

    const normalizedTargetId = String(targetUserId || '').trim();
    if (!normalizedTargetId) throw new BadRequestException('Target user id is required');

    if (actingUser.id === normalizedTargetId) {
      throw new ForbiddenException('Admin users cannot delete their own account');
    }

    const user = await this.userStateRepository.findOne({ where: { id: normalizedTargetId } });
    if (!user) return false;

    const [firstUser] = await this.userStateRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    if (firstUser?.id === user.id) {
      throw new ForbiddenException('The first user in the database cannot be removed');
    }
    if (user.isAdmin) {
      const adminCount = await this.userStateRepository.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin');
      }
    }

    const result = await this.userStateRepository.delete({ id: normalizedTargetId });
    return Number(result.affected || 0) > 0;
  }
}