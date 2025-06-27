import { Test, TestingModule } from '@nestjs/testing';
import { AmapService } from './amap.service';

describe('AmapService', () => {
  let service: AmapService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmapService],
    }).compile();

    service = module.get<AmapService>(AmapService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
