import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ControllersModule } from './controllers/controllers.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ControllersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
