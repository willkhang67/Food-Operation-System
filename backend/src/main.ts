import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is required for Stripe webhook signature verification.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Fails closed rather than refusing to boot: without the secret the limiter
  // still works, it just cannot tell one customer behind the BFF from another.
  if (
    process.env.NODE_ENV === 'production' &&
    !process.env.INTERNAL_PROXY_SECRET
  ) {
    console.warn(
      '[startup] INTERNAL_PROXY_SECRET is not set. Rate limiting will treat every ' +
        'request arriving through the BFF as one client, so a single busy customer ' +
        'can lock out the rest. Set the same value here and on the frontend.',
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 5000);
}
void bootstrap();
