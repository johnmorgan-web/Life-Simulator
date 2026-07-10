import { BadRequestException, ConflictException, ForbiddenException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { GameService } from '../game/logic/game.service';
import { GameState } from '../game/types/game.types';
import { UserStateEntity } from './entities/user-state.entity';
import jobBoard from '../data/jobBoard.constants';

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
const DISPLAY_HANDLE_REGEX = /^[A-Za-z0-9_]{3,24}$/;
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

const HANDLE_ADJECTIVES = [
  'Brisk', 'Clever', 'Curious', 'Daring', 'Eager', 'Fierce', 'Focused', 'Gentle',
  'Happy', 'Jolly', 'Kind', 'Merry', 'Nimble', 'Rapid', 'Sharp', 'Sunny',
  'Swift', 'Wise', 'Zesty', 'Bright', 'Bold', 'Calm', 'Lucky', 'Spry',
];

const HANDLE_NOUNS = [
  'Falcon', 'Otter', 'Panda', 'Comet', 'River', 'Maple', 'Cedar', 'Sparrow',
  'Robin', 'Rocket', 'Harbor', 'Aurora', 'Meadow', 'Pebble', 'Ranger', 'Summit',
  'Beacon', 'Glider', 'Juniper', 'Kestrel', 'Lynx', 'Nova', 'Quest', 'Turtle',
];

@Injectable()
export class UserService implements OnModuleInit {
  private readonly authSessions = new Map<string, { userId: string; expiresAt: number }>();
  private readonly pandemicKeywords = ['pandemic', 'epidemic', 'outbreak', 'covid', 'sars', 'h1n1', 'influenza', 'flu', 'virus'];

  private hasPandemicKeyword(value: unknown): boolean {
    const text = String(value || '').toLowerCase();
    if (!text) return false;
    return this.pandemicKeywords.some((keyword) => text.includes(keyword));
  }

  private isPandemicHistoricalEvent(event: any): boolean {
    if (!event || typeof event !== 'object') return false;
    if (this.hasPandemicKeyword(event.id)) return true;
    if (this.hasPandemicKeyword(event.title)) return true;
    if (this.hasPandemicKeyword(event.era)) return true;
    if (this.hasPandemicKeyword(event.summary)) return true;
    if (this.hasPandemicKeyword(event.realWorldImpact)) return true;

    if (Array.isArray(event.keyStatistics)) {
      return event.keyStatistics.some((entry: unknown) => this.hasPandemicKeyword(entry));
    }

    return false;
  }

  private normalizeEconomyOverrides(raw: any) {
    if (!raw || typeof raw !== 'object') {
      return {
        recessionSeverity: 0,
        inflationPressure: 0,
        jobAvailability: 100,
        marketVolatility: 100,
        nextMonthStockShock: 0,
      };
    }
    return {
      recessionSeverity: Math.max(0, Math.min(100, Math.round(Number(raw?.recessionSeverity || 0)))),
      inflationPressure: Math.max(0, Math.min(100, Math.round(Number(raw?.inflationPressure || 0)))),
      jobAvailability: 100, // always deterministic, not event/admin modifiable
      marketVolatility: Math.max(50, Math.min(220, Math.round(Number(raw?.marketVolatility || 100)))),
      nextMonthStockShock: Math.max(-0.7, Math.min(0.7, Number(raw?.nextMonthStockShock || 0))),
    };
  }

  private normalizeHistoricalEconomicEvent(raw: any) {
    if (raw === null) return null;
    if (!raw || typeof raw !== 'object') return null;

    const id = String(raw?.id || '').trim();
    const title = String(raw?.title || '').trim();
    if (!id || !title) return null;

    const effectsRaw = raw?.effects && typeof raw.effects === 'object' ? raw.effects : {};
    return {
      id,
      title,
      era: String(raw?.era || 'Historical Event'),
      summary: String(raw?.summary || ''),
      realWorldImpact: String(raw?.realWorldImpact || ''),
      keyStatistics: Array.isArray(raw?.keyStatistics)
        ? raw.keyStatistics.map((entry: any) => String(entry || '').trim()).filter(Boolean)
        : [],
      totalMonths: Math.max(1, Math.min(36, Math.floor(Number(raw?.totalMonths || raw?.monthsRemaining || 1)))),
      monthsRemaining: Math.max(0, Math.min(36, Math.floor(Number(raw?.monthsRemaining || raw?.totalMonths || 1)))),
      startedMonth: Math.max(1, Math.min(12, Number(raw?.startedMonth || 1))),
      startedYear: Math.max(1, Number(raw?.startedYear || 2026)),
      effects: {
        jobLossChance: Math.max(0, Math.min(1, Number(effectsRaw?.jobLossChance || 0))),
        forcedDowngradeChance: Math.max(0, Math.min(1, Number(effectsRaw?.forcedDowngradeChance || 0))),
        payCutPercent: Math.max(0, Math.min(0.9, Number(effectsRaw?.payCutPercent || 0))),
        monthlyStockShock: Math.max(-0.7, Math.min(0.7, Number(effectsRaw?.monthlyStockShock || 0))),
        essentialCostIncreasePercent: Math.max(0, Math.min(0.6, Number(effectsRaw?.essentialCostIncreasePercent || 0))),
        creditDragPerMonth: Math.max(0, Math.min(50, Number(effectsRaw?.creditDragPerMonth || 0))),
        jobSearchBlocked: Boolean(effectsRaw?.jobSearchBlocked),
      },
    };
  }

  constructor(
    @InjectRepository(UserStateEntity)
    private readonly userStateRepository: Repository<UserStateEntity>,
    private gameService: GameService,
  ) {}

  async onModuleInit() {
    await this.ensureAdminUserOnStartup();
    await this.backfillDisplayHandles();
    await this.scrubLegacyAdminGiftState();
  }

  private async scrubLegacyAdminGiftState() {
    const users = await this.userStateRepository.find();
    for (const user of users) {
      const currentState = { ...(user.state || {}) } as Record<string, any>;
      let changed = false;

      if ('pendingAdminGifts' in currentState) {
        delete currentState.pendingAdminGifts;
        changed = true;
      }

      if (Array.isArray(currentState.logs)) {
        const filteredLogs = currentState.logs.filter((entry: any) => {
          const message = String(entry?.msg || '');
          if (message.includes('Admin support gift queued for next month')) return false;
          if (/^🎁 You sent \$/.test(message)) return false;
          return true;
        });

        if (filteredLogs.length !== currentState.logs.length) {
          currentState.logs = filteredLogs;
          changed = true;
        }
      }

      if (!changed) continue;
      user.state = this.buildPersistedState(currentState);
      user.updatedAt = new Date();
      await this.userStateRepository.save(user);
    }
  }

  private normalizeDisplayHandle(raw: string): string {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '';
    const safe = trimmed.replace(/[^A-Za-z0-9_]/g, '');
    return safe.slice(0, 24);
  }

  private randomDisplayHandle(): string {
    const adjective = HANDLE_ADJECTIVES[Math.floor(Math.random() * HANDLE_ADJECTIVES.length)];
    const noun = HANDLE_NOUNS[Math.floor(Math.random() * HANDLE_NOUNS.length)];
    const suffix = `${Math.floor(Math.random() * 9000) + 1000}`;
    return `${adjective}${noun}${suffix}`;
  }

  private async resolveUniqueDisplayHandle(preferred?: string, excludeUserId?: string): Promise<string> {
    const candidateBase = this.normalizeDisplayHandle(preferred || '');
    const initial = candidateBase && DISPLAY_HANDLE_REGEX.test(candidateBase)
      ? candidateBase
      : this.randomDisplayHandle();

    let candidate = initial;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = await this.userStateRepository.findOne({ where: { displayHandle: candidate } });
      if (!existing || existing.id === excludeUserId) return candidate;
      candidate = this.randomDisplayHandle();
    }

    return `${initial.slice(0, 16)}${Date.now().toString().slice(-6)}`;
  }

  private async backfillDisplayHandles() {
    const users = await this.userStateRepository.find();
    for (const user of users) {
      if (user.displayHandle && DISPLAY_HANDLE_REGEX.test(user.displayHandle)) continue;
      user.displayHandle = await this.resolveUniqueDisplayHandle(user.displayHandle || user.username || undefined, user.id);
      await this.userStateRepository.save(user);
    }
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
      stateWithoutName.displayHandle
      || stateWithoutName.currentUser
      || stateWithoutName.username
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
    const resolvedDisplayHandle = String(entity.displayHandle || entity.username || (entity.state as any)?.currentUser || 'Player');
    const snapshot: Partial<GameState> & { id: string } = {
      ...(entity.state || {}),
      username: entity.username,
      displayHandle: resolvedDisplayHandle,
      currentUser: resolvedDisplayHandle,
      name: resolvedDisplayHandle,
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
    const resolvedDisplayHandle = String(entity.displayHandle || (hydratedState as any).displayHandle || entity.username || 'Player');
    return {
      ...hydratedState,
      username: entity.username,
      displayHandle: resolvedDisplayHandle,
      currentUser: resolvedDisplayHandle,
      name: resolvedDisplayHandle,
      id: entity.id,
      isAdmin: Boolean(entity.isAdmin),
    };
  }

  private async normalizeLegacyFinancialState(entity: UserStateEntity): Promise<UserStateEntity> {
    const currentState = { ...(entity.state || {}) } as Record<string, any>;
    let changed = false;

    const normalizeMoney = (key: 'check' | 'savings' | 'debt', options?: { absolute?: boolean; min?: number }) => {
      const raw = Number(currentState[key] ?? 0);
      let next = Number.isFinite(raw) ? raw : 0;
      if (options?.absolute) next = Math.abs(next);
      if (typeof options?.min === 'number') next = Math.max(options.min, next);
      if (next !== raw) {
        currentState[key] = next;
        changed = true;
      }
    };

    // Legacy bug fix pass: debt should never be negative; balances should be finite.
    normalizeMoney('check');
    normalizeMoney('savings');
    normalizeMoney('debt', { absolute: true, min: 0 });

    if (!changed) return entity;

    const month = Number(currentState.month || 0);
    const year = Number(currentState.year || 0);
    const logs = Array.isArray(currentState.logs) ? [...currentState.logs] : [];
    logs.push({
      date: `${month}/${year}`,
      msg: 'System normalization: corrected legacy financial values for consistency.',
    });
    currentState.logs = logs;

    entity.state = this.buildPersistedState(currentState);
    entity.updatedAt = new Date();
    return this.userStateRepository.save(entity);
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
    const pandemicHistoryMonths = (() => {
      const monthKeys = new Set<string>();
      const logs = Array.isArray((state as any).logs) ? (state as any).logs : [];
      for (const entry of logs) {
        if (!this.hasPandemicKeyword(entry?.msg)) continue;
        const date = String(entry?.date || '').trim();
        if (date) monthKeys.add(date);
      }

      const eventHistory = Array.isArray((state as any).eventHistory)
        ? (state as any).eventHistory
        : [];
      for (const event of eventHistory) {
        const looksPandemic = this.hasPandemicKeyword(event?.title)
          || this.hasPandemicKeyword(event?.desc)
          || this.hasPandemicKeyword(event?.message);
        if (!looksPandemic) continue;
        const month = Number(event?.month || 0);
        const year = Number(event?.year || 0);
        if (month > 0 && year > 0) monthKeys.add(`${month}/${year}`);
      }

      const activeHistoricalEvent = (state as any).historicalEconomicEvent;
      const activeMonthsRemaining = Math.max(0, Number(activeHistoricalEvent?.monthsRemaining || 0));
      if (activeMonthsRemaining > 0) {
        const month = Number((state as any).month || 0);
        const year = Number((state as any).year || 0);
        if (month > 0 && year > 0) monthKeys.add(`${month}/${year}`);
      }

      return monthKeys.size;
    })();
    const activeHistoricalEvent = (state as any).historicalEconomicEvent;
    const activeMonthsRemaining = Math.max(0, Number(activeHistoricalEvent?.monthsRemaining || 0));
    const isPandemicHistoricalEvent = activeMonthsRemaining > 0 || this.isPandemicHistoricalEvent(activeHistoricalEvent);

    const publicHandle = String(entity.displayHandle || entity.username || (state as any).currentUser || 'Player');

    return {
      id: entity.id,
      username: entity.username,
      displayHandle: publicHandle,
      name: publicHandle,
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
        cityName: String((state as any).city?.name || 'Unknown'),
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
        pandemicHistoryMonths,
        isPandemicHistoricalEvent,
        historicalEventId: String((state as any).historicalEconomicEvent?.id || ''),
        historicalEventEra: String((state as any).historicalEconomicEvent?.era || ''),
        historicalEventTitle: String((state as any).historicalEconomicEvent?.title || ''),
        historicalEventMonthsRemaining: Math.max(0, Number((state as any).historicalEconomicEvent?.monthsRemaining || 0)),
        historicalEventResetNextMonth: Boolean((state as any).historicalEventResetNextMonth),
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
    preferredDisplayHandle?: string,
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
    // FERPA/privacy-safe default: always assign an anonymized display handle at signup.
    const displayHandle = await this.resolveUniqueDisplayHandle(undefined, id);
    const createdUser = this.userStateRepository.create({
      id,
      username: trimmedUsername,
      displayHandle,
      passwordHash,
      isAdmin: existingUsersCount === 0,
      state: this.buildPersistedState({ ...initialState, currentUser: displayHandle, displayHandle }),
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
      user.displayHandle = user.displayHandle && DISPLAY_HANDLE_REGEX.test(user.displayHandle)
        ? user.displayHandle
        : await this.resolveUniqueDisplayHandle(user.displayHandle || user.username || undefined, user.id);
      const upgraded = await this.userStateRepository.save(user);
      return this.toGameSnapshot(upgraded);
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.displayHandle || !DISPLAY_HANDLE_REGEX.test(user.displayHandle)) {
      user.displayHandle = await this.resolveUniqueDisplayHandle(user.displayHandle || user.username || undefined, user.id);
      await this.userStateRepository.save(user);
    }

    const normalizedUser = await this.normalizeLegacyFinancialState(user);
    const authToken = this.issueSession(user.id);
    return this.toGameSnapshot(normalizedUser, authToken);
  }

  /**
   * Get user by id
   */
  async getUserById(id: string): Promise<(Partial<GameState> & { id: string }) | null> {
    const user = await this.userStateRepository.findOne({ where: { id } });
    if (!user) return null;
    const normalizedUser = await this.normalizeLegacyFinancialState(user);
    return this.toGameSnapshot(normalizedUser);
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
    const normalizedUsers = await Promise.all(users.map((user) => this.normalizeLegacyFinancialState(user)));
    return normalizedUsers.map((user) => {
      const snapshot = this.toGameSnapshot(user);
      return {
        ...snapshot,
        username: null,
        currentUser: snapshot.displayHandle || snapshot.currentUser || 'Player',
        name: snapshot.displayHandle || snapshot.name || 'Player',
      };
    });
  }

  async listUsersForAdmin(authorization?: string): Promise<Array<ReturnType<UserService['toAdminUserSummary']>>> {
    await this.assertAdminSession(authorization);
    const users = await this.userStateRepository.find({ order: { createdAt: 'ASC' } });
    const normalizedUsers = await Promise.all(users.map((user) => this.normalizeLegacyFinancialState(user)));
    const [firstUser] = await this.userStateRepository.find({
      order: { createdAt: 'ASC' },
      take: 1,
    });
    const firstUserId = firstUser?.id || null;
    return normalizedUsers.map((user) => this.toAdminUserSummary(user, user.id === firstUserId));
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
      displayHandle?: string;
      password?: string;
      jobTitle?: string;
      economyOverrides?: {
        recessionSeverity?: number;
        inflationPressure?: number;
        jobAvailability?: number;
        marketVolatility?: number;
        nextMonthStockShock?: number;
      };
      economyApplyMonths?: number;
      historicalEconomicEvent?: {
        id?: string;
        title?: string;
        era?: string;
        summary?: string;
        realWorldImpact?: string;
        keyStatistics?: string[];
        totalMonths?: number;
        monthsRemaining?: number;
        startedMonth?: number;
        startedYear?: number;
        effects?: {
          jobLossChance?: number;
          forcedDowngradeChance?: number;
          payCutPercent?: number;
          monthlyStockShock?: number;
          essentialCostIncreasePercent?: number;
          creditDragPerMonth?: number;
          jobSearchBlocked?: boolean;
        };
      } | null;
      historicalEventResetNextMonth?: boolean;
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
      if (!Number.isFinite(debt) || debt < 0) throw new BadRequestException('Invalid debt value');
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

    if (changes.displayHandle !== undefined) {
      const requestedHandle = this.normalizeDisplayHandle(String(changes.displayHandle || ''));
      if (!requestedHandle || !DISPLAY_HANDLE_REGEX.test(requestedHandle)) {
        throw new BadRequestException('Display handle must be 3-24 characters and use letters, numbers, or underscores only');
      }

      const displayOwner = await this.userStateRepository.findOne({ where: { displayHandle: requestedHandle } });
      if (displayOwner && displayOwner.id !== user.id) {
        throw new ConflictException('Display handle is already taken');
      }

      user.displayHandle = requestedHandle;
      nextState.displayHandle = requestedHandle;
      nextState.currentUser = requestedHandle;
    }

    if (changes.password !== undefined) {
      const password = String(changes.password || '');
      if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
        throw new BadRequestException('Password must be at least 8 characters and include 1 number and 1 symbol');
      }
      user.passwordHash = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    }

    if (changes.jobTitle !== undefined) {
      const requestedTitle = String(changes.jobTitle || '').trim();
      if (!requestedTitle) {
        throw new BadRequestException('Job title is required when assigning a job');
      }
      const selectedJob = jobBoard.find((job: any) => String(job?.title || '') === requestedTitle);
      if (!selectedJob) {
        throw new BadRequestException('Invalid job title');
      }

      const month = Math.max(1, Math.min(12, Number(nextState.month || 1)));
      const year = Math.max(1, Number(nextState.year || 2026));
      const priorJob = nextState.job && typeof nextState.job === 'object' ? nextState.job : null;
      const priorTitle = String(priorJob?.title || '').trim();
      const priorTenure = Math.max(0, Number(nextState.tenure || 0));

      if (priorTitle && priorTitle !== requestedTitle) {
        const careerHistory = Array.isArray(nextState.careerHistory) ? [...nextState.careerHistory] : [];
        careerHistory.unshift({
          title: priorTitle,
          months: priorTenure,
          startMonth: Number(nextState.jobStartMonth || month),
          startYear: Number(nextState.jobStartYear || year),
          endMonth: month,
          endYear: year,
        });
        nextState.careerHistory = careerHistory.slice(0, 60);
      }

      nextState.job = {
        title: selectedJob.title,
        base: Number(selectedJob.base || 0),
        tReq: Number(selectedJob.tReq || 1),
        odds: Number(selectedJob.odds || 1),
        cat: selectedJob.cat,
        subcat: selectedJob.subcat,
      };
      nextState.pendingJob = null;
      nextState.tenure = 0;
      nextState.jobStartMonth = month;
      nextState.jobStartYear = year;

      const logs = Array.isArray(nextState.logs) ? [...nextState.logs] : [];
      logs.push({
        date: `${month}/${year}`,
        msg: `🛠️ Admin reassigned career to ${selectedJob.title}`,
      });
      nextState.logs = logs;
    }

    if (changes.economyOverrides !== undefined) {
      nextState.economyOverrides = this.normalizeEconomyOverrides(changes.economyOverrides);
      if (changes.economyApplyMonths !== undefined) {
        nextState.economyOverrideMonthsRemaining = Math.max(0, Math.floor(Number(changes.economyApplyMonths || 0)));
      }
      const month = Math.max(1, Math.min(12, Number(nextState.month || 1)));
      const year = Math.max(1, Number(nextState.year || 2026));
      const logs = Array.isArray(nextState.logs) ? [...nextState.logs] : [];
      const months = Number(nextState.economyOverrideMonthsRemaining || 0);
      logs.push({
        date: `${month}/${year}`,
        msg: months > 0
          ? `📈 Admin economy controls applied for ${months} month${months === 1 ? '' : 's'}.`
          : '📈 Admin economy controls saved (persistent until changed).',
      });
      nextState.logs = logs;
    } else if (changes.economyApplyMonths !== undefined) {
      nextState.economyOverrideMonthsRemaining = Math.max(0, Math.floor(Number(changes.economyApplyMonths || 0)));
    }

    if (changes.historicalEconomicEvent !== undefined) {
      nextState.historicalEconomicEvent = this.normalizeHistoricalEconomicEvent(changes.historicalEconomicEvent);
      nextState.historicalEventResetNextMonth = false;
      const month = Math.max(1, Math.min(12, Number(nextState.month || 1)));
      const year = Math.max(1, Number(nextState.year || 2026));
      const logs = Array.isArray(nextState.logs) ? [...nextState.logs] : [];
      if (nextState.historicalEconomicEvent) {
        const eventTitle = String(nextState.historicalEconomicEvent.title || 'Historical Event');
        const months = Math.max(0, Number(nextState.historicalEconomicEvent.monthsRemaining || 0));
        logs.push({
          date: `${month}/${year}`,
          msg: `📚 Admin activated historical scenario: ${eventTitle} (${months} month${months === 1 ? '' : 's'})`,
        });
      } else {
        logs.push({
          date: `${month}/${year}`,
          msg: '📚 Admin cleared historical scenario effects.',
        });
      }
      nextState.logs = logs;
    }

    if (changes.historicalEventResetNextMonth !== undefined) {
      nextState.historicalEventResetNextMonth = Boolean(changes.historicalEventResetNextMonth);
      const month = Math.max(1, Math.min(12, Number(nextState.month || 1)));
      const year = Math.max(1, Number(nextState.year || 2026));
      const logs = Array.isArray(nextState.logs) ? [...nextState.logs] : [];
      logs.push({
        date: `${month}/${year}`,
        msg: nextState.historicalEventResetNextMonth
          ? '🛟 Admin scheduled return to normal circumstances next month.'
          : '🛟 Admin canceled next-month normalization schedule.',
      });
      nextState.logs = logs;
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