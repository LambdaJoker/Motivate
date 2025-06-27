import { Controller, Get, Query } from '@nestjs/common';
import { AmapService } from './amap.service';

@Controller('amap')
export class AmapController {
  constructor(private readonly amapService: AmapService) {}

  @Get('search')
  async search(@Query('keywords') keywords: string) {
    if (!keywords) {
      return {
        status: 0,
        message: 'Keywords are required',
      };
    }
    return await this.amapService.search(keywords);
  }
}
