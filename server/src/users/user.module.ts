import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GameModule } from '../game/game.module';
import { UserStateEntity } from './entities/user-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserStateEntity]),
    GameModule,
  ],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}