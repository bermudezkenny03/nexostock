import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { assertProductionSecrets } from '@nexostock/common';
import { createGateway } from './create-gateway';

async function bootstrap(): Promise<void> {
  assertProductionSecrets();
  const app = await createGateway();
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
  Logger.log(`API gateway listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
