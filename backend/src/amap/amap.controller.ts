import { Controller, Get, Query, Param, Post, Body } from '@nestjs/common';
import { AmapService } from './amap.service';

@Controller('amap')
export class AmapController {
  constructor(private readonly amapService: AmapService) {}

  @Get('search')
  async search(@Query('keywords') keywords: string, @Query('city') city: string = '北京') {
    if (!keywords) {
      return {
        status: 0,
        message: 'Keywords are required',
      };
    }
    return await this.amapService.search(keywords, city);
  }

  @Get('weather')
  async getWeather(@Query('city') city: string) {
    if (!city) {
      return {
        status: 0,
        message: 'City is required',
      };
    }
    return await this.amapService.getWeather(city);
  }

  @Get('poi/:id')
  async getPoiDetail(@Param('id') id: string) {
    if (!id) {
      return {
        status: 0,
        message: 'POI ID is required',
      };
    }
    return await this.amapService.getPoiDetail(id);
  }

  @Get('route/walking')
  async getWalkingRoute(
    @Query('origin') origin: string, 
    @Query('destination') destination: string
  ) {
    if (!origin || !destination) {
      return {
        status: 0,
        message: 'Origin and destination are required',
      };
    }
    return await this.amapService.getWalkingRoute(origin, destination);
  }

  @Get('route/bicycling')
  async getBicyclingRoute(
    @Query('origin') origin: string, 
    @Query('destination') destination: string
  ) {
    if (!origin || !destination) {
      return {
        status: 0,
        message: 'Origin and destination are required',
      };
    }
    return await this.amapService.getBicyclingRoute(origin, destination);
  }

  @Post('route/driving')
  async getDrivingRoute(@Body() planItems: any[]) {
    if (!planItems || planItems.length < 2) {
      return {
        status: 0,
        message: 'At least two plan items are required',
      };
    }
    return await this.amapService.getDrivingRoute(planItems);
  }

  @Post('navigation-url')
  generateNavigationUrl(
    @Body() data: { 
      start: { latitude: number, longitude: number },
      end: { latitude: number, longitude: number },
      mode?: 'car' | 'walk' | 'bus' | 'ride'
    }
  ) {
    return {
      url: this.amapService.generateAmapNavigationUrl(data.start, data.end, data.mode)
    };
  }

  @Post('map-link') 
  generateMapLink(@Body() data: { planItems: any[], title: string }) {
    return {
      url: this.amapService.generateMapWebLink(data.planItems, data.title)
    };
  }
}
