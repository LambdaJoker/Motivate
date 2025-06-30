import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { Itinerary, PlanItem, TransportMode } from '@prisma/client';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { AmapService } from '../amap/amap.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { addDays, format, addHours, addMinutes, set, getHours } from 'date-fns';

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amapService: AmapService,
  ) {}

  async create(createItineraryDto: CreateItineraryDto, userId: number): Promise<Itinerary> {
    const { title, description, startDate, endDate, planItems } = createItineraryDto;
  
    // 使用 Prisma 事务来确保行程和行程项的原子性创建
    return this.prisma.$transaction(async (prisma) => {
      const itinerary = await prisma.itinerary.create({
        data: {
          title,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          user: {
            connect: { id: userId },
          },
        },
      });
  
      if (planItems && planItems.length > 0) {
        // 按日期分组并确定 orderIndex
        const itemsByDate = planItems.reduce<Record<string, CreatePlanItemDto[]>>((acc, item) => {
          const dateStr = format(new Date(item.planDate), 'yyyy-MM-dd');
          if (!acc[dateStr]) {
            acc[dateStr] = [];
          }
          acc[dateStr].push(item);
          return acc;
        }, {});
  
        for (const dateStr of Object.keys(itemsByDate)) {
          const items = itemsByDate[dateStr];
          let orderIndex = 0;
          const dataToCreate = items.map(item => ({
            ...item,
            planDate: new Date(item.planDate),
            itineraryId: itinerary.id,
            orderIndex: orderIndex++,
            startTime: item.startTime ? new Date(item.startTime) : undefined,
            latitude: typeof item.latitude === 'string' ? parseFloat(item.latitude) : item.latitude,
            longitude: typeof item.longitude === 'string' ? parseFloat(item.longitude) : item.longitude,
          }));
  
          await prisma.planItem.createMany({
            data: dataToCreate,
          });
        }
      }
  
      return itinerary;
    });
  }

  async findAllForUser(userId: number): Promise<Itinerary[]> {
    return this.prisma.itinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getItineraryById(itineraryId: number, userId: number): Promise<Itinerary> {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
    });

    if (!itinerary || itinerary.userId !== userId) {
      throw new ForbiddenException('You are not allowed to access this itinerary');
    }
    return itinerary;
  }

  async getItineraryWithPlanItems(itineraryId: number, userId: number): Promise<any> {
    const itinerary = await this.getItineraryById(itineraryId, userId);
    
    const planItems = await this.prisma.planItem.findMany({
      where: { itineraryId },
      orderBy: [
        { planDate: 'asc' },
        { orderIndex: 'asc' }
      ],
    });
    
    return { ...itinerary, planItems };
  }

  async addPlanItem(itineraryId: number, userId: number, createPlanItemDto: CreatePlanItemDto): Promise<PlanItem> {
    await this.getItineraryById(itineraryId, userId); // Authorization check

    const { planDate, ...restOfDto } = createPlanItemDto;

    // Get the highest orderIndex for the given date and itinerary
    const lastPlanItem = await this.prisma.planItem.findFirst({
      where: {
        itineraryId,
        planDate: new Date(planDate),
      },
      orderBy: { orderIndex: 'desc' },
    });

    const newOrderIndex = lastPlanItem ? lastPlanItem.orderIndex + 1 : 0;

    return this.prisma.planItem.create({
      data: {
        ...restOfDto,
        planDate: new Date(planDate),
        orderIndex: newOrderIndex,
        itinerary: {
          connect: { id: itineraryId },
        },
      },
    });
  }

  async getPlanItemsForDate(itineraryId: number, userId: number, planDate: string): Promise<PlanItem[]> {
    await this.getItineraryById(itineraryId, userId); // Authorization check

    if (!planDate) {
      throw new BadRequestException('planDate query parameter is required.');
    }

    return this.prisma.planItem.findMany({
      where: {
        itineraryId,
        planDate: new Date(planDate),
      },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async getRouteForDate(itineraryId: number, userId: number, planDate: string) {
    if (!planDate) {
      throw new BadRequestException('planDate query parameter is required.');
    }
    
    // First, get the plan items for the given date, which includes the auth check
    const planItems = await this.getPlanItemsForDate(itineraryId, userId, planDate);

    // Now, call the AmapService to get the route
    return this.amapService.getDrivingRoute(
      planItems.map(item => ({
        ...item,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude)
      }))
    );
  }

  async generateItinerary(generateDto: GenerateItineraryDto, userId: number): Promise<Itinerary> {
    const { title, description, startDate, durationDays, destination, origin, mustVisitSpots, optionalSpots, transportMode } = generateDto;
    
    this.logger.log(`Generating itinerary for: ${title} from ${origin || 'N/A'} to ${destination}`);

    const finalPlanItems: CreatePlanItemDto[] = [];
    let currentTripDate = new Date(startDate);

    // 1. 处理城际交通
    if (origin) {
      const originPOI = await this.amapService.geocode(origin);
      const destinationPOI = await this.amapService.geocode(destination);
      if (originPOI && destinationPOI) {
        const travelDurationMinutes = await this.amapService.getRouteDuration(originPOI.location, destinationPOI.location, TransportMode.driving);
        
        const travelItem = this.createTravelPlanItem(origin, destination, currentTripDate, travelDurationMinutes, originPOI, destinationPOI);
        finalPlanItems.push(travelItem);
        
        // 更新到达目的地后的时间
        currentTripDate = addMinutes(currentTripDate, travelDurationMinutes);
      }
    }

    // 2. 搜索所有市内景点信息
    const allSpots = [...mustVisitSpots, ...(optionalSpots || [])];
    const spotPromises = allSpots.map(spot => this.amapService.search(spot, destination));
    const spotResults = await Promise.all(spotPromises);
    const allPOIs = spotResults
      .flatMap(result => result.pois || [])
      .filter((poi, index, self) => index === self.findIndex(p => p.id === poi.id));

    if (allPOIs.length === 0 && !origin) { // If no POIs and no origin trip, then it's a failed plan
      throw new BadRequestException('无法找到任何相关景点，请调整搜索条件。');
    }

    // 3. 按天智能分配市内行程
    const poisPerDay = Math.ceil(allPOIs.length / durationDays);
    let poiIndex = 0;

    for (let day = 0; day < durationDays; day++) {
      let currentTime = set(currentTripDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      if(day > 0) { // For subsequent days, reset start time
         currentTime = set(addDays(new Date(startDate), day), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      } else { // For the first day, respect the arrival time
         currentTripDate = currentTime;
      }
      
      const endOfDay = set(currentTime, { hours: 22, minutes: 0, seconds: 0, milliseconds: 0 });
      
      let dayPOIs = allPOIs.slice(poiIndex, poiIndex + poisPerDay);
      poiIndex += poisPerDay;

      let hasPlannedLunch = false;
      let hasPlannedDinner = false;

      for (let i = 0; i < dayPOIs.length; i++) {
        if (currentTime > endOfDay) break;

        const currentPOI = dayPOIs[i];
        
        // 添加午餐
        if (getHours(currentTime) >= 12 && !hasPlannedLunch) {
            const lunchSpot = await this.amapService.findNearbyRestaurant(currentPOI.location);
            if (lunchSpot) {
                const travelToLunch = await this.amapService.getRouteDuration(dayPOIs[i-1].location, lunchSpot.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelToLunch);
                
                finalPlanItems.push(this.createMealPlanItem(lunchSpot, currentTime, '午餐'));
                currentTime = addMinutes(currentTime, 60); // 午餐时间1小时

                const travelFromLunch = await this.amapService.getRouteDuration(lunchSpot.location, currentPOI.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelFromLunch);
            }
            hasPlannedLunch = true;
        }

        // 添加当前景点
        finalPlanItems.push(this.createActivityPlanItem(currentPOI, currentTime, transportMode));
        currentTime = addMinutes(currentTime, 120); // 默认游玩2小时

        // 添加晚餐
        if (getHours(currentTime) >= 18 && !hasPlannedDinner) {
            const dinnerSpot = await this.amapService.findNearbyRestaurant(currentPOI.location);
            if (dinnerSpot) {
                const travelToDinner = await this.amapService.getRouteDuration(currentPOI.location, dinnerSpot.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelToDinner);

                finalPlanItems.push(this.createMealPlanItem(dinnerSpot, currentTime, '晚餐'));
                currentTime = addMinutes(currentTime, 90); // 晚餐时间1.5小时
            }
            hasPlannedDinner = true;
        }

        // 计算到下一个景点的交通时间
        if (i < dayPOIs.length - 1) {
            const nextPOI = dayPOIs[i + 1];
            const travelDuration = await this.amapService.getRouteDuration(currentPOI.location, nextPOI.location, (transportMode as TransportMode) || TransportMode.driving);
            currentTime = addMinutes(currentTime, travelDuration);
        }
      }
    }

    const createDto: CreateItineraryDto = {
      title,
      description,
      startDate,
      endDate: format(addDays(new Date(startDate), durationDays - 1), 'yyyy-MM-dd'),
      planItems: finalPlanItems,
    };
    
    this.logger.log(`Successfully generated ${finalPlanItems.length} plan items for ${title}.`);
    return this.create(createDto, userId);
  }

  private createTravelPlanItem(originName, destName, time, duration, originPOI, destPOI): CreatePlanItemDto {
    return {
      planDate: time.toISOString(),
      locationName: `从 ${originName} 到 ${destName}`,
      amapPoiId: `${originPOI.id}-${destPOI.id}`,
      latitude: destPOI.location.split(',')[1],
      longitude: destPOI.location.split(',')[0],
      startTime: time.toISOString(),
      durationMinutes: duration,
      transportMode: TransportMode.driving,
      notes: `城际交通，从 ${originName} 出发。`,
    };
  }

  private createActivityPlanItem(poi, time, transportMode): CreatePlanItemDto {
    return {
      planDate: time.toISOString(),
      locationName: poi.name,
      amapPoiId: poi.id,
      latitude: parseFloat(poi.location.split(',')[1]),
      longitude: parseFloat(poi.location.split(',')[0]),
      startTime: time.toISOString(),
      durationMinutes: 120, // 默认游玩120分钟
      transportMode: transportMode as TransportMode || TransportMode.driving,
      notes: `地址：${poi.address}`,
    };
  }

  private createMealPlanItem(poi, time, mealType): CreatePlanItemDto {
      return {
          planDate: time.toISOString(),
          locationName: `${mealType} - ${poi.name}`,
          amapPoiId: poi.id,
          latitude: parseFloat(poi.location.split(',')[1]),
          longitude: parseFloat(poi.location.split(',')[0]),
          startTime: time.toISOString(),
          durationMinutes: mealType === '午餐' ? 60 : 90,
          transportMode: TransportMode.walking, // 假设餐厅很近，步行
          notes: `推荐餐厅，地址：${poi.address}`,
      };
  }
}
