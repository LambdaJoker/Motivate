import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { Itinerary, PlanItem, TransportMode } from '@prisma/client';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { AmapService } from '../amap/amap.service';
import { LlmService } from '../llm/llm.service';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { addDays, format, addHours, addMinutes, set, getHours } from 'date-fns';

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly amapService: AmapService,
    private readonly llmService: LlmService,
  ) {}

  async create(createItineraryDto: CreateItineraryDto, userId: number): Promise<Itinerary> {
    const { title, description, startDate, endDate, planItems, estimatedCost, generationParams } = createItineraryDto;
  
    // 使用 Prisma 事务来确保行程和行程项的原子性创建
    return this.prisma.$transaction(async (prisma) => {
      const itinerary = await prisma.itinerary.create({
        data: {
          title,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          totalEstimatedCost: estimatedCost || 0,
          generationParams,
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
            // 确保存入数据库的是数字类型，防止前台取出字符串后定位出问题
            latitude: typeof item.latitude === 'string' ? Number(item.latitude) : item.latitude,
            longitude: typeof item.longitude === 'string' ? Number(item.longitude) : item.longitude,
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

  async getItineraryById(itineraryId: number, userId: number, checkAuth: boolean = true): Promise<Itinerary> {
    const itinerary = await this.prisma.itinerary.findUnique({
      where: { id: itineraryId },
    });

    if (!itinerary || (checkAuth && itinerary.userId !== userId)) {
      throw new ForbiddenException('You are not allowed to access this itinerary');
    }
    return itinerary;
  }

  async deleteItinerary(itineraryId: number, userId: number): Promise<{ success: boolean }> {
    const checkAuth = userId !== 1;
    await this.getItineraryById(itineraryId, userId, checkAuth);
    
    await this.prisma.itinerary.delete({
      where: { id: itineraryId }
    });
    
    return { success: true };
  }

  async getItineraryWithPlanItems(itineraryId: number, userId: number): Promise<any> {
    // 临时方案：未登录(userId为1时)，我们允许免认证查询，只要能查到就可以
    const checkAuth = userId !== 1;
    const itinerary = await this.getItineraryById(itineraryId, userId, checkAuth);
    
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
    const checkAuth = userId !== 1;
    await this.getItineraryById(itineraryId, userId, checkAuth); // Authorization check

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

  async generateItinerary(generateDto: GenerateItineraryDto, userId: number, existingItineraryId?: number): Promise<Itinerary> {
    const { title, description, startDate, durationDays, destination, origin, mustVisitSpots, optionalSpots, transportMode, budget } = generateDto;
    
    const itineraryPrompt = `Generating itinerary for: ${title} from ${origin || 'N/A'} to ${destination} with budget ¥${budget}`;
    this.logger.log(itineraryPrompt);

    // 1. 调用大模型生成行程计划
    const llmPlan = await this.llmService.generateItinerary({
      origin: origin || '',
      destination,
      startDate,
      durationDays,
      budget: budget || 0,
      mustVisitSpots: [...(mustVisitSpots || []), ...(optionalSpots || [])],
      transportMode: transportMode || 'driving',
      // 把完整的 title 等信息作为上下文传过去（可以通过目的地拼接等方式隐式传递给 prompt）
      fullPromptContext: itineraryPrompt
    } as any);

    const finalPlanItems: CreatePlanItemDto[] = [];
    let totalEstimatedCost = llmPlan.totalEstimatedCost || 0;

    // 2. 解析大模型的 JSON 并补全坐标 (调用高德地图服务)
    for (const day of llmPlan.days) {
      for (const item of day.items) {
        let lat = 0;
        let lng = 0;

        // 如果是具体的地点，去高德查坐标
        if (item.locationName && item.locationName !== '无') {
          // 优先搜索具体地点，如果找不到，回退到目的地城市搜索
          // 【修复】当搜索具体的景点名称时（如“五台山”），不需要限制在 destination 城市内
          // 因为用户可能输入的 destination 是“忻州市”，但景点可能在下属县区，甚至跨市
          // 我们直接用空字符串作为 city，让高德进行全国搜索，凭借权重通常能搜到最著名的那个景点
          const poiResult = await this.amapService.search(item.locationName, '');
          const pois = poiResult.pois || [];
          const validPois = pois.filter(p => p.location);
          if (validPois.length > 0) {
            const coords = validPois[0].location.split(',');
            lng = Number(coords[0]);
            lat = Number(coords[1]);
          } else {
            // 如果全局搜不到，尝试带上城市前缀再次搜索
            const fallbackPoiResult = await this.amapService.search(`${destination} ${item.locationName}`, '');
            const fallbackPois = fallbackPoiResult.pois || [];
            const fallbackValidPois = fallbackPois.filter(p => p.location);
            if (fallbackValidPois.length > 0) {
              const coords = fallbackValidPois[0].location.split(',');
              lng = Number(coords[0]);
              lat = Number(coords[1]);
            }
          }
        }

        // 解析时间
        const [hours, minutes] = (item.time || '00:00').split(':').map(Number);
        const itemDate = new Date(day.date);
        itemDate.setHours(hours || 0, minutes || 0, 0, 0);

        finalPlanItems.push({
          title: item.title,
          description: item.description || '',
          planDate: day.date,
          startTime: itemDate.toISOString(),
          endTime: addMinutes(itemDate, item.durationMinutes || 0).toISOString(),
          durationMinutes: item.durationMinutes || 0,
          itemType: item.type,
          locationName: item.locationName,
          latitude: lat,
          longitude: lng,
          estimatedCost: item.estimatedCost || 0,
          transportMode: transportMode as TransportMode || TransportMode.driving,
        });
      }
    }

    // 3. 创建最终的行程对象
    const itineraryData: CreateItineraryDto = {
      title,
      description,
      startDate: new Date(startDate).toISOString(),
      endDate: addDays(new Date(startDate), durationDays - 1).toISOString(),
      planItems: finalPlanItems,
      budget: budget,
      estimatedCost: totalEstimatedCost,
      generationParams: JSON.stringify(generateDto)
    };

    if (existingItineraryId) {
      return this.update(existingItineraryId, itineraryData, userId);
    } else {
      return this.create(itineraryData, userId);
    }
  }

  async update(itineraryId: number, updateDto: CreateItineraryDto, userId: number): Promise<Itinerary> {
    const { title, description, startDate, endDate, planItems, estimatedCost, generationParams } = updateDto;
    
    // Check auth
    await this.getItineraryById(itineraryId, userId, userId !== 1);

    this.logger.log(`Updating itinerary in-place: ${itineraryId}`);

    return this.prisma.$transaction(async (prisma) => {
      // 1. Delete existing plan items
      await prisma.planItem.deleteMany({
        where: { itineraryId }
      });

      // 2. Update itinerary metadata
      const itinerary = await prisma.itinerary.update({
        where: { id: itineraryId },
        data: {
          title,
          description,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          totalEstimatedCost: estimatedCost || 0,
          generationParams,
        },
      });

      // 3. Recreate plan items
      if (planItems && planItems.length > 0) {
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
            // 确保存入数据库的是数字类型，防止前台取出字符串后定位出问题
            latitude: typeof item.latitude === 'string' ? Number(item.latitude) : item.latitude,
            longitude: typeof item.longitude === 'string' ? Number(item.longitude) : item.longitude,
          }));
  
          await prisma.planItem.createMany({
            data: dataToCreate,
          });
        }
      }

      return itinerary;
    });
  }

  private parseCost(cost: any): number {
    if (!cost || typeof cost !== 'string') return 0;
    const parsed = parseFloat(cost);
    return isNaN(parsed) ? 0 : parsed;
  }

  private createTravelPlanItem(originName, destName, time, duration, originPOI, destPOI, cost, mode: TransportMode = TransportMode.driving, vehicleName?: string): CreatePlanItemDto {
    const validTime = time instanceof Date ? time : new Date(time);
    const finalTime = isNaN(validTime.getTime()) ? new Date() : validTime;
    const finalDuration = isNaN(Number(duration)) ? 0 : Number(duration);
    
    // AMap location format is "longitude,latitude"
    const coords = destPOI.location.split(',');
    
    let title = `从 ${originName} 到 ${destName}`;
    if (vehicleName) {
      title = `乘坐${vehicleName}从 ${originName} 到 ${destName}`;
    }
    
    return {
      title,
      description: `预计耗时 ${finalDuration} 分钟。`,
      planDate: finalTime.toISOString(),
      startTime: finalTime.toISOString(),
      endTime: addMinutes(finalTime, finalDuration).toISOString(),
      durationMinutes: finalDuration,
      itemType: 'transport',
      locationName: destName,
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
      estimatedCost: cost,
      transportMode: mode,
    };
  }

  private createActivityPlanItem(poi, time, transportMode, cost, durationMinutes = 120): CreatePlanItemDto {
    const validTime = time instanceof Date ? time : new Date(time);
    const finalTime = isNaN(validTime.getTime()) ? new Date() : validTime;
    
    // AMap location format is "longitude,latitude"
    const coords = poi.location.split(',');
    
    return {
      title: poi.name,
      description: `地址：${poi.address || '无'}`,
      planDate: finalTime.toISOString(),
      startTime: finalTime.toISOString(),
      endTime: addMinutes(finalTime, durationMinutes).toISOString(),
      durationMinutes: durationMinutes,
      itemType: 'activity',
      locationName: poi.name,
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
      estimatedCost: cost,
      transportMode: (transportMode as TransportMode) || TransportMode.driving,
    };
  }

  private createMealPlanItem(poi, time, mealType, cost): CreatePlanItemDto {
    const mealDuration = mealType === '午餐' ? 60 : 90; // 午餐1小时，晚餐1.5小时
    const validTime = time instanceof Date ? time : new Date(time);
    const finalTime = isNaN(validTime.getTime()) ? new Date() : validTime;
    
    // AMap location format is "longitude,latitude"
    const coords = poi.location.split(',');
    
    return {
      title: `${mealType}：${poi.name}`,
      description: `推荐餐厅，地址：${poi.address}`,
      planDate: finalTime.toISOString(),
      startTime: finalTime.toISOString(),
      endTime: addMinutes(finalTime, mealDuration).toISOString(),
      durationMinutes: mealDuration,
      itemType: 'food',
      locationName: poi.name,
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
      estimatedCost: cost,
      transportMode: TransportMode.walking, // 假设到餐厅是步行
    };
  }

  private createHotelPlanItem(poi, time, cost): CreatePlanItemDto {
    const validTime = time instanceof Date ? time : new Date(time);
    const finalTime = isNaN(validTime.getTime()) ? new Date() : validTime;
    const stayDuration = 30; // 办理入住30分钟
    
    // AMap location format is "longitude,latitude"
    const coords = poi.location.split(',');
    
    return {
      title: `入住酒店：${poi.name}`,
      description: `推荐住宿，地址：${poi.address}`,
      planDate: finalTime.toISOString(),
      startTime: finalTime.toISOString(),
      endTime: addMinutes(finalTime, stayDuration).toISOString(),
      durationMinutes: stayDuration,
      itemType: 'accommodation',
      locationName: poi.name,
      latitude: Number(coords[1]),
      longitude: Number(coords[0]),
      estimatedCost: cost,
      transportMode: TransportMode.driving,
    };
  }
}
