import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ControllersModule } from './controllers/controllers.module.js';
import configuration from './configuration.js';
import { DATABASE_OPTIONS } from './database/index.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRoot({
      ...DATABASE_OPTIONS,
      type: 'postgres',
      autoLoadEntities: true,
    }),
    ControllersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
