import { Module } from '@nestjs/common';
import { ControllersModule } from './controllers/controllers.module.js';

@Module({
  imports: [
    ControllersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
