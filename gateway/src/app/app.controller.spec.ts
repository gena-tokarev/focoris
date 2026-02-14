import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { ProxyService } from '../proxy/proxy.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: ProxyService,
          useValue: {
            forwardRequest: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest
              .fn()
              .mockReturnValueOnce('http://localhost:3001')
              .mockReturnValueOnce('http://localhost:3002'),
          },
        },
      ],
    }).compile();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.health()).toEqual({
        status: 'ok',
        service: 'gateway',
      });
    });
  });
});
