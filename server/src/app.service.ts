import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private routes: string[] = [];

  setRoutes(routes: string[]) {
    this.routes = routes;
  }

  getHello(): object {
    return {
      message: 'Hello World!!',
      routes: this.routes,
    };
  }
}
