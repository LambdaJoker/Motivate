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
        // 移除 citylimit: true，防止用户输入的著名景点（如五台山）不在目标城市内时，搜出错误的同名小地点
        params: { key: this.amapKey, keywords, city, show_fields: 'biz_ext' },
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

  async getWeather(cityAdcode: string) {
    const url = `${this.amapApiBase}/weather/weatherInfo`;
    const { data } = await firstValueFrom(
      this.httpService.get(url, {
        params: { 
          key: this.amapKey, 
          city: cityAdcode, 
          extensions: 'all', // 返回未来几天的预报天气
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
    if (!address || address === 'undefined') {
      this.logger.warn(`Invalid address for geocoding: ${address}`);
      return null;
    }
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

  async findNearby(location: string, keywords: string, types: string = '', radius: number = 15000): Promise<any> {
    const url = `${this.amapApiBase}/place/around`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.amapKey,
            location,
            keywords,
            types,
            radius,
            sortrule: 'weight',
            page_size: 15, // 增加单次查询数量，以便更好地过滤无用数据
            show_fields: 'biz_ext'
          },
        }),
      );
      if (data && data.status === '1' && data.pois && data.pois.length > 0) {
        // Filter out POIs without location and prefer those with business info if possible
        const validPois = data.pois.filter(p => p.location);
        
        // 如果是找美食或酒店，优先返回有评分的
        if (types === '050000' || types === '100000') {
          validPois.sort((a, b) => {
            const ratingA = parseFloat(a.biz_ext?.rating || '0');
            const ratingB = parseFloat(b.biz_ext?.rating || '0');
            return ratingB - ratingA;
          });
        }
        
        return validPois.length > 0 ? validPois : null;
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to find nearby ${keywords}`, error);
      return null;
    }
  }

  async findNearbyRestaurant(location: string): Promise<any> {
    const pois = await this.findNearby(location, '美食', '050000', 2000);
    return pois ? pois[0] : null;
  }

  async findNearbyHotel(location: string): Promise<any> {
    const pois = await this.findNearby(location, '酒店', '100000', 3000);
    return pois ? pois[0] : null;
  }

  async findPopularAttractions(city: string, limit: number = 10): Promise<any[]> {
    const url = `${this.amapApiBase}/place/text`;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(url, {
          params: {
            key: this.amapKey,
            keywords: '风景名胜',
            types: '110000', // 旅游景点
            city,
            citylimit: true,
            sortrule: 'weight',
            page_size: limit,
          },
        }),
      );
      if (data && data.status === '1' && data.pois) {
        return data.pois.filter(p => p.location);
      }
      return [];
    } catch (error) {
      this.logger.error(`Failed to find popular attractions in ${city}`, error);
      return [];
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

  async getIntercityRouteDetails(origin: string, destination: string): Promise<{ duration: number; distance: number; cost: number; mode: TransportMode; vehicle: string }> {
    if (!origin || !destination || origin === 'undefined' || destination === 'undefined') {
      this.logger.warn(`Invalid origin or destination for intercity route: origin=${origin}, dest=${destination}`);
      return { duration: 60, distance: 10, cost: 30, mode: TransportMode.driving, vehicle: '打车' };
    }

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

      let distance = 0;

      if (data && data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
        const path = data.route.paths[0];
        distance = Math.ceil(parseInt(path.distance, 10) / 1000); // in km
      } else {
        // 如果API没有返回有效路径，使用球面距离(Haversine)作为保底
        const [lon1, lat1] = origin.split(',').map(Number);
        const [lon2, lat2] = destination.split(',').map(Number);
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        distance = R * c;
      }

      // 根据距离智能判断交通工具和时间
      if (distance > 800) {
        // 大于800公里推荐飞机 (时速约800km/h + 2小时安检候机)
        const duration = Math.ceil((distance / 800) * 60) + 120;
        const cost = Math.ceil(distance * 0.8); // 机票约 0.8元/km
        return { duration, distance, cost, mode: TransportMode.transit, vehicle: '飞机' };
      } else if (distance > 300) {
        // 300~800公里推荐高铁 (时速约250km/h + 1小时进出站)
        const duration = Math.ceil((distance / 250) * 60) + 60;
        const cost = Math.ceil(distance * 0.4); // 高铁约 0.4元/km
        return { duration, distance, cost, mode: TransportMode.transit, vehicle: '高铁' };
      } else if (distance > 50) {
        // 50~300公里推荐驾车/大巴 (时速约80km/h)
        const duration = Math.ceil((distance / 80) * 60);
        const cost = Math.ceil(distance * 0.6); // 油费/过路费约 0.6元/km
        return { duration, distance, cost, mode: TransportMode.driving, vehicle: '驾车' };
      } else {
        // 50公里以内，短途打车 (时速约40km/h)
        const duration = Math.ceil((distance / 40) * 60);
        const cost = Math.ceil(distance * 2.5); // 打车约 2.5元/km
        return { duration, distance, cost, mode: TransportMode.driving, vehicle: '打车' };
      }

    } catch (error) {
      this.logger.error(`Failed to get intercity route details`, error);
      // 发生错误时返回默认值
      return { duration: 180, distance: 300, cost: 200, mode: TransportMode.transit, vehicle: '高铁' };
    }
  }
}
