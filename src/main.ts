import { AppModule } from './app.module.js';
import { FsArchAppBuilder } from '@fsarch/server';
import { DATABASE_OPTIONS } from './database/index.js';
import { Role } from './constants/role.enum.js';

async function bootstrap() {
  const app = await new FsArchAppBuilder(AppModule, {
    name: 'Metric-Server',
    version: '1.0.0',
  })
    .addSwagger({
      title: 'Metric-Server',
      description: 'The Metric-Server API for storing and querying metrics',
      version: '1.0',
    })
    .enableAuth()
    .enableUac(Object.values(Role))
    .enableSoftDeletion()
    .setDatabase(DATABASE_OPTIONS)
    .build();

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
