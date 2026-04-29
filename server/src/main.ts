import { INestApplication, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ModulesContainer, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';

function pathParts(value: unknown): string[] {
  if (value === undefined || value === null) return [''];
  if (Array.isArray(value)) return value.map((part) => String(part));
  return [String(value)];
}

function normalizeRoutePath(controllerPath: string, methodPath: string): string {
  const rawParts = [controllerPath, methodPath]
    .map((part) => String(part || ''))
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);

  if (!rawParts.length) return '/';
  return `/${rawParts.join('/')}`;
}

function collectNestRoutes(app: INestApplication): string[] {
  const modules = app.get(ModulesContainer);
  const routes = new Set<string>();

  for (const moduleRef of modules.values()) {
    for (const controllerWrapper of moduleRef.controllers.values()) {
      const instance = controllerWrapper.instance;
      const metatype = controllerWrapper.metatype;
      if (!instance || !metatype) continue;

      const controllerPaths = pathParts(Reflect.getMetadata(PATH_METADATA, metatype));
      const prototype = Object.getPrototypeOf(instance);
      const methodNames = Object.getOwnPropertyNames(prototype);

      for (const methodName of methodNames) {
        if (methodName === 'constructor') continue;

        const handler = prototype[methodName];
        if (typeof handler !== 'function') continue;

        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        if (requestMethod === undefined) continue;

        const methodPaths = pathParts(Reflect.getMetadata(PATH_METADATA, handler));
        const methodLabel = String(RequestMethod[requestMethod] || 'GET').toUpperCase();

        for (const controllerPath of controllerPaths) {
          for (const methodPath of methodPaths) {
            const fullPath = normalizeRoutePath(controllerPath, methodPath);
            routes.add(`${methodLabel} ${fullPath}`);
          }
        }
      }
    }
  }

  // Sort routes: by path depth, then alphabetically by path, then by HTTP method priority
  const methodPriority: Record<string, number> = { GET: 0, POST: 1, DELETE: 2 };
  
  return Array.from(routes).sort((a, b) => {
    const [methodA, pathA] = a.split(' ');
    const [methodB, pathB] = b.split(' ');
    
    // Get path segments (for depth comparison)
    const segmentsA = pathA.split('/').filter(Boolean).length;
    const segmentsB = pathB.split('/').filter(Boolean).length;
    
    // Primary sort: by path depth (root first)
    if (segmentsA !== segmentsB) {
      return segmentsA - segmentsB;
    }
    
    // Secondary sort: by path alphabetically
    if (pathA !== pathB) {
      return pathA.localeCompare(pathB);
    }
    
    // Tertiary sort: by HTTP method priority (GET > POST > DELETE > others)
    const priorityA = methodPriority[methodA] ?? 3;
    const priorityB = methodPriority[methodB] ?? 3;
    return priorityA - priorityB;
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.init();

  const appService = app.get(AppService);
  appService.setRoutes(collectNestRoutes(app));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
