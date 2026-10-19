import { FsArchAppBuilder } from '@fsarch/server';
import { descriptor } from './lib/index.js';

async function bootstrap() {
  const app = await new FsArchAppBuilder(descriptor.module.register(), {
    name: 'Metric-Server',
    version: '1.0.0',
  })
    .addSwagger(descriptor.swagger)
    .enableAuth()
    .enableUac(descriptor.uac.roles)
    .enableSoftDeletion()
    .setDatabase({ entities: descriptor.entities, migrations: descriptor.migrations })
    .build();

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
