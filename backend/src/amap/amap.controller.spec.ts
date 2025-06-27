import { Test, TestingModule } from '@nestjs/testing';
import { AmapController } from './amap.controller';

describe('AmapController', () => {
  let controller: AmapController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmapController],
    }).compile();

    controller = module.get<AmapController>(AmapController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
