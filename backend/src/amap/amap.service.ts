/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-26 08:05:40
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-29 22:39:57
 * @FilePath: \Motivate\backend\src\amap\amap.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreatePlanItemDto } from '../itinerary/dto/create-plan-item.dto';
import { TransportMode } from '@prisma/client';

// Define a type for the items in the array, must have latitude and longitude.
type RoutableItem = Pick<CreatePlanItemDto, 'latitude' | 'longitude'> & {
  locationName?: string;
};

@Injectable()
export class AmapService {
  private readonly logger = new Logger(AmapService.name);
  private readonly amapKey: string;
  private readonly amapApiBase: string = 'https://restapi.amap.com/v3';
  private readonly amapApiV5Base: string = 'https://restapi.amap.com/v5';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const key = this.configService.get<string>('AMAP_KEY');
    if (!key) {
      throw new Error('AMAP_KEY is not configured in the environment variables.');
    }
    this.amapKey = key;
  }

  async search(keywords: string, city: string) {
    const url = `${this.amapApiBase}/place/text`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { key: this.amapKey, keywords, city, citylimit: true, show_fields: 'biz_ext' },
      }),
    );
    return data;
  }

  async getDrivingRoute(planItems: RoutableItem[]) {
    if (planItems.length < 2) {
      // It's better to return a specific structure for client handling
      return { route: null, info: 'At least two points are required for routing.' };
    }

    const origin = `${planItems[0].longitude},${planItems[0].latitude}`;
    const destination = `${planItems[planItems.length - 1].longitude},${planItems[planItems.length - 1].latitude}`;
    
    let waypoints = '';
    if (planItems.length > 2) {
      waypoints = planItems
        .slice(1, -1)
        .map(item => `${item.longitude},${item.latitude}`)
        .join(';');
    }

    const url = `${this.amapApiV5Base}/direction/driving`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          origin, 
          destination, 
          waypoints,
          show_fields: 'path', // Request path details
        },
      }),
    );
    return data;
  }

  async getWalkingRoute(origin: string, destination: string) {
    const url = `${this.amapApiBase}/direction/walking`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          origin, 
          destination,
        },
      }),
    );
    return data;
  }

  async getBicyclingRoute(origin: string, destination: string) {
    const url = `${this.amapApiBase}/direction/bicycling`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          origin, 
          destination,
        },
      }),
    );
    return data;
  }

  async getWeather(city: string) {
    const url = `${this.amapApiBase}/weather/weatherInfo`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          city, 
          extensions: 'all', // 返回预报天气
        },
      }),
    );
    return data;
  }

  async getPoiDetail(id: string) {
    const url = `${this.amapApiBase}/place/detail`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          id,
        },
      }),
    );
    return data;
  }

  generateAmapNavigationUrl(start: RoutableItem, end: RoutableItem, mode: 'car' | 'walk' | 'bus' | 'ride' = 'car') {
    const startCoord = `${start.longitude},${start.latitude}`;
    const endCoord = `${end.longitude},${end.latitude}`;
    
    // 构建高德导航URL，可以在移动端打开
    return `https://uri.amap.com/navigation?from=${startCoord}&to=${endCoord}&mode=${mode}&callnative=1`;
  }

  generateMapWebLink(planItems: RoutableItem[], itineraryTitle: string) {
    if (planItems.length === 0) {
      return null;
    }
    
    const points = planItems.map(item => {
      return {
        name: item.locationName || '景点',
        location: `${item.longitude},${item.latitude}`,
      };
    });
    
    // 创建地图分享链接，客户端可以打开
    // 这里是简化版，实际需要更完整的参数
    const pointsStr = encodeURIComponent(JSON.stringify(points));
    return `https://uri.amap.com/marker?markers=${pointsStr}&name=${encodeURIComponent(itineraryTitle)}`;
  }

  async geocode(address: string, city?: string): Promise<any> {
    const url = `${this.amapApiBase}/geocode/geo`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.amapKey,
            address,
            city,
          },
        }),
      );
      if (data && data.status === '1' && data.geocodes.length > 0) {
        return data.geocodes[0];
      }
      this.logger.warn(`Geocoding failed for address: ${address}`);
      return null;
    } catch (error) {
      this.logger.error(`Error during geocoding for address: ${address}`, error);
      return null;
    }
  }

  async findNearbyRestaurant(location: string): Promise<any> {
    const url = `${this.amapApiBase}/place/around`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.amapKey,
            location,
            keywords: '美食',
            types: '050000', // 餐饮服务
            radius: 1000,
            sortrule: 'rating',
            page_size: 1,
            show_fields: 'biz_ext'
          },
        }),
      );
      if (data && data.status === '1' && data.pois.length > 0) {
        return data.pois[0];
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to find nearby restaurant', error);
      return null;
    }
  }

  async getRouteDuration(origin: string, destination: string, mode: TransportMode): Promise<number> {
    const urlMap = {
      [TransportMode.driving]: `${this.amapApiV5Base}/direction/driving`,
      [TransportMode.walking]: `${this.amapApiBase}/direction/walking`,
      [TransportMode.bicycling]: `${this.amapApiBase}/direction/bicycling`,
      [TransportMode.transit]: `${this.amapApiV5Base}/direction/transit/integrated`,
    };

    const url = urlMap[mode] || urlMap[TransportMode.driving];

    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: { key: this.amapKey, origin, destination },
        }),
      );

      if (data && data.status === '1' && data.route) {
        const path = data.route.paths?.[0] || data.route.transits?.[0];
        if (path && path.duration) {
          return Math.ceil(parseInt(path.duration, 10) / 60);
        }
      }
      return 30;
    } catch (error) {
      this.logger.error(`Failed to get route duration for mode ${mode}`, error);
      return 30;
    }
  }

  async getIntercityRouteDetails(origin: string, destination: string): Promise<{ duration: number; distance: number; cost: number }> {
    const url = `${this.amapApiV5Base}/direction/driving`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.amapKey,
            origin,
            destination,
            show_fields: 'cost', // Request cost details
          },
        }),
      );

      if (data && data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0];
        const duration = Math.ceil(parseInt(path.duration, 10) / 60); // in minutes
        const distance = Math.ceil(parseInt(path.distance, 10) / 1000); // in km

        const tollCost = path.cost?.tolls ? parseFloat(path.cost.tolls) : 0;
        
        // 简单估算燃油费：假设 0.6 元/公里
        const fuelCost = distance * 0.6;
        
        const totalCost = Math.ceil(tollCost + fuelCost);

        return { duration, distance, cost: totalCost };
      }
      // 如果API调用失败或未返回路径，则返回默认值
      this.logger.warn(`Could not fetch intercity route details for ${origin} -> ${destination}. Returning default values.`);
      return { duration: 180, distance: 300, cost: 200 };
    } catch (error) {
      this.logger.error(`Failed to get intercity route details`, error);
      // 发生错误时返回默认值
      return { duration: 180, distance: 300, cost: 200 };
    }
  }
}
