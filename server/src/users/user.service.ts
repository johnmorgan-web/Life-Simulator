import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { GameService } from '../game/logic/game.service';
import { GameState } from '../game/types/game.types';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private gameService: GameService,
  ) {}

  /**
   * Create a new user with initial game state
   */
  async createUser(name: string): Promise<User> {
    const initialState = this.gameService.getInitialState(name);
    const createdUser = new this.userModel(initialState);
    return createdUser.save();
  }

  /**
   * Get user by name
   */
  async getUserByName(name: string): Promise<User | null> {
    return this.userModel.findOne({ name }).exec();
  }

  /**
   * Update user state
   */
  async updateUser(name: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ name }, updateData, { new: true }).exec();
  }

  /**
   * Advance one month in the game
   */
  async processMonth(name: string): Promise<User | null> {
    const user = await this.getUserByName(name);
    if (!user) return null;

    const newState = await this.gameService.processMonth(user as Partial<GameState>);
    return this.updateUser(name, newState as any);
  }

  /**
   * Apply a game action to user state
   */
  async applyAction(name: string, action: any): Promise<User | null> {
    const user = await this.getUserByName(name);
    if (!user) return null;

    const newState = await this.gameService.applyAction(user as Partial<GameState>, action);
    return this.updateUser(name, newState as any);
  }

  /**
   * List all users
   */
  async listAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  /**
   * Delete a user
   */
  async deleteUser(name: string): Promise<boolean> {
    const result = await this.userModel.findOneAndDelete({ name }).exec();
    return !!result;
  }
}