import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const configuredPath = configService.get<string>('SQLITE_DB_PATH');
        const fallbackPath = path.join(process.cwd(), 'data', 'life-simulator.sqlite');
        const dbPath = configuredPath || fallbackPath;
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });

        return {
          type: 'sqlite' as const,
          database: dbPath,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}