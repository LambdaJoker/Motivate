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
    const { title, description, startDate, durationDays, destination, origin, mustVisitSpots, optionalSpots, transportMode, budget } = generateDto;
    
    this.logger.log(`Generating itinerary for: ${title} from ${origin || 'N/A'} to ${destination} with budget ¥${budget}`);

    const finalPlanItems: CreatePlanItemDto[] = [];
    let totalEstimatedCost = 0;
    let currentTripDate = new Date(startDate);

    // 1. 处理城际交通
    if (origin) {
      const originPOI = await this.amapService.geocode(origin);
      const destinationPOI = await this.amapService.geocode(destination);
      if (originPOI && destinationPOI) {
        
        const routeDetails = await this.amapService.getIntercityRouteDetails(originPOI.location, destinationPOI.location);
        
        const travelCost = routeDetails.cost;
        totalEstimatedCost += travelCost;

        const travelDurationMinutes = routeDetails.duration;
        
        const travelItem = this.createTravelPlanItem(origin, destination, currentTripDate, travelDurationMinutes, originPOI, destinationPOI, travelCost);
        finalPlanItems.push(travelItem);
        
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

    if (allPOIs.length === 0 && !origin) {
      throw new BadRequestException('无法找到任何相关景点，请调整搜索条件。');
    }

    // 3. 按天智能分配市内行程
    const poisPerDay = Math.ceil(allPOIs.length / durationDays);
    let poiIndex = 0;

    for (let day = 0; day < durationDays; day++) {
      let currentTime = set(currentTripDate, { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      if(day > 0) {
         currentTime = set(addDays(new Date(startDate), day), { hours: 9, minutes: 0, seconds: 0, milliseconds: 0 });
      } else {
         currentTripDate = currentTime;
      }
      
      const endOfDay = set(currentTime, { hours: 22, minutes: 0, seconds: 0, milliseconds: 0 });
      
      let dayPOIs = allPOIs.slice(poiIndex, poiIndex + poisPerDay);
      poiIndex += poisPerDay;

      let hasPlannedLunch = false;
      let hasPlannedDinner = false;
      let lastPOI: any = null;

      for (let i = 0; i < dayPOIs.length; i++) {
        if (currentTime >= endOfDay) break;

        const currentPOI = dayPOIs[i];
        
        // 计算从上一个地点到当前景点的交通时间
        if (lastPOI) {
          const travelDuration = await this.amapService.getRouteDuration(lastPOI.location, currentPOI.location, (transportMode as TransportMode) || TransportMode.driving);
          currentTime = addMinutes(currentTime, travelDuration);
          // 交通费用暂时无法精确估算，暂不计入总花费
        }

        // 添加午餐
        if (getHours(currentTime) >= 12 && !hasPlannedLunch) {
            const lunchSpot = await this.amapService.findNearbyRestaurant(currentPOI.location);
            if (lunchSpot) {
                const lunchCost = this.parseCost(lunchSpot.biz_ext?.cost) || 35; // 默认午餐35元
                totalEstimatedCost += lunchCost;

                const travelToLunch = await this.amapService.getRouteDuration(currentPOI.location, lunchSpot.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelToLunch);
                
                finalPlanItems.push(this.createMealPlanItem(lunchSpot, currentTime, '午餐', lunchCost));
                currentTime = addMinutes(currentTime, 60); // 午餐时间1小时

                const travelFromLunch = await this.amapService.getRouteDuration(lunchSpot.location, currentPOI.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelFromLunch);
            }
            hasPlannedLunch = true;
        }

        // 添加当前景点
        const activityCost = this.parseCost(currentPOI.biz_ext?.cost) || 0; // 景点门票，默认为0
        totalEstimatedCost += activityCost;
        finalPlanItems.push(this.createActivityPlanItem(currentPOI, currentTime, transportMode, activityCost));
        currentTime = addMinutes(currentTime, 120); // 默认游玩2小时
        lastPOI = currentPOI;

        // 添加晚餐
        if (getHours(currentTime) >= 18 && !hasPlannedDinner) {
            const dinnerSpot = await this.amapService.findNearbyRestaurant(currentPOI.location);
            if (dinnerSpot) {
                const dinnerCost = this.parseCost(dinnerSpot.biz_ext?.cost) || 50; // 默认晚餐50元
                totalEstimatedCost += dinnerCost;

                const travelToDinner = await this.amapService.getRouteDuration(currentPOI.location, dinnerSpot.location, (transportMode as TransportMode) || TransportMode.driving);
                currentTime = addMinutes(currentTime, travelToDinner);

                finalPlanItems.push(this.createMealPlanItem(dinnerSpot, currentTime, '晚餐', dinnerCost));
                currentTime = addMinutes(currentTime, 90); // 晚餐时间1.5小时
                lastPOI = dinnerSpot; // 更新最后一个点为餐厅
            }
            hasPlannedDinner = true;
        }
      }
    }

    // 4. 创建最终的行程对象
    const itineraryData: CreateItineraryDto = {
      title,
      description,
      startDate: new Date(startDate).toISOString(),
      endDate: addDays(new Date(startDate), durationDays - 1).toISOString(),
      planItems: finalPlanItems,
      budget: budget,
      estimatedCost: totalEstimatedCost,
    };

    const itinerary = await this.create(itineraryData, userId);
    return itinerary;
  }

  private parseCost(cost: any): number {
    if (!cost || typeof cost !== 'string') return 0;
    const parsed = parseFloat(cost);
    return isNaN(parsed) ? 0 : parsed;
  }

  private createTravelPlanItem(originName, destName, time, duration, originPOI, destPOI, cost): CreatePlanItemDto {
    return {
      title: `从 ${originName} 到 ${destName}`,
      description: `预计耗时 ${duration} 分钟。`,
      planDate: time.toISOString(),
      startTime: time.toISOString(),
      endTime: addMinutes(time, duration).toISOString(),
      itemType: 'transport',
      locationName: destName,
      latitude: destPOI.location.split(',')[1],
      longitude: destPOI.location.split(',')[0],
      estimatedCost: cost,
      transportMode: TransportMode.driving,
    };
  }

  private createActivityPlanItem(poi, time, transportMode, cost): CreatePlanItemDto {
    const visitDuration = 120; // 默认游玩2小时
    return {
      title: poi.name,
      description: `地址：${poi.address || '无'}`,
      planDate: time.toISOString(),
      startTime: time.toISOString(),
      endTime: addMinutes(time, visitDuration).toISOString(),
      itemType: 'activity',
      locationName: poi.name,
      latitude: poi.location.split(',')[1],
      longitude: poi.location.split(',')[0],
      estimatedCost: cost,
      transportMode: (transportMode as TransportMode) || TransportMode.driving,
    };
  }

  private createMealPlanItem(poi, time, mealType, cost): CreatePlanItemDto {
    const mealDuration = mealType === '午餐' ? 60 : 90; // 午餐1小时，晚餐1.5小时
    return {
      title: `${mealType}：${poi.name}`,
      description: `推荐餐厅，地址：${poi.address}`,
      planDate: time.toISOString(),
      startTime: time.toISOString(),
      endTime: addMinutes(time, mealDuration).toISOString(),
      itemType: 'food',
      locationName: poi.name,
      latitude: poi.location.split(',')[1],
      longitude: poi.location.split(',')[0],
      estimatedCost: cost,
      transportMode: TransportMode.walking, // 假设到餐厅是步行
    };
  }
}
