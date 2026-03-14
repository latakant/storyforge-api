import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              details: { database: { status: 'up' } },
            }),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
  });

  it('should return health status ok', async () => {
    const result = await controller.check();
    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'ok' });
  });
});
