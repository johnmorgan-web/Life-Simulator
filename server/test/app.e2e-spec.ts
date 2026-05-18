import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    const dataSource = app.get(DataSource, { strict: false });
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer()).get('/').expect(200).expect({
      message: 'Hello World!!',
      routes: [],
    });
  });

  it('/game/stocks/advance (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/game/stocks/advance')
      .send({
        state: {
          month: 12,
          year: 2026,
          marketPrices: {
            AAPL: 260.72,
            MSFT: 405.76,
            NVDA: 184.76,
            AMZN: 214.34,
            KO: 77.88,
            JPM: 288.73,
            XOM: 148.13,
            VTI: 333.57,
            TSLA: 399.25,
            GOOGL: 307.04,
            META: 653.91,
            NFLX: 96.94,
            DIS: 101.32,
            SPY: 677.05,
            QQQ: 607.73,
            DIA: 477.74,
          },
          marketPriceHistory: [],
          economyOverrides: {
            recessionSeverity: 20,
            inflationPressure: 25,
            marketVolatility: 130,
            nextMonthStockShock: 0.1,
          },
          historicalEconomicEvent: {
            id: 'evt-e2e',
            title: 'E2E Scenario',
            monthsRemaining: 6,
            effects: {
              monthlyStockShock: -0.05,
            },
          },
          historicalEventResetNextMonth: false,
        },
      })
      .expect(201);

    expect(response.body).toBeDefined();
    expect(response.body.marketPricesPrevious).toBeDefined();
    expect(response.body.marketPrices).toBeDefined();
    expect(Array.isArray(response.body.marketPriceHistory)).toBe(true);
    expect(response.body.marketPriceHistory.length).toBeGreaterThan(0);
    expect(response.body.appliedShock).toBeCloseTo(0.05, 6);
    expect(typeof response.body.registeredUsers).toBe('number');
    expect(response.body.marketCapsByTicker).toBeDefined();
    expect(response.body.floatSharesByTicker).toBeDefined();
    expect(Number(response.body.marketCapsByTicker.AAPL || 0)).toBeGreaterThan(
      0,
    );
    expect(Number(response.body.floatSharesByTicker.AAPL || 0)).toBeGreaterThan(
      0,
    );
    expect(response.body.economyOverrides?.nextMonthStockShock).toBe(0);

    const last =
      response.body.marketPriceHistory[
        response.body.marketPriceHistory.length - 1
      ];
    expect(last.month).toBe(1);
    expect(last.year).toBe(2027);
  });
});
