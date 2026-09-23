import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const uploadDest = configService.get<string>('upload.dest')!;
  app.useStaticAssets(join(uploadDest, 'images'), {
    prefix: '/uploads/images',
  });

  const globalPrefix = configService.get<string>('app.globalPrefix') ?? 'api';
  if (globalPrefix) {
    app.setGlobalPrefix(globalPrefix);
  }

  const corsOrigin = configService.get<string>('app.corsOrigin')!;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Guard global JWT (se puede sobrescribir con @Public())
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  const port = configService.get<number>('app.port') ?? 3000;
  await app.listen(port);
  const basePath = globalPrefix ? `/${globalPrefix}` : '';
  console.log(
    `Application is running on: http://localhost:${port}${basePath} (API_GLOBAL_PREFIX=${globalPrefix || '(none)'})`,
  );
}
bootstrap();
