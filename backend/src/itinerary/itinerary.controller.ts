/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-27 10:54:20
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 08:51:26
 * @FilePath: \Motivate\backend\src\itinerary\itinerary.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-27 10:54:20
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 08:33:32
 * @FilePath: \Motivate\backend\src\itinerary\itinerary.controller.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Controller, Post, Body, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ItineraryService } from './itinerary.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { User } from '@prisma/client';
import { CreatePlanItemDto } from './dto/create-plan-item.dto';
import { GenerateItineraryDto } from './dto/generate-itinerary.dto';
import { Public } from '../auth/decorator/public.decorator';

@Controller('itineraries')
export class ItineraryController {
  constructor(private readonly itineraryService: ItineraryService) {}

  @Post()
  create(
    @Body() createItineraryDto: CreateItineraryDto,
    @GetUser() user: User,
  ) {
    return this.itineraryService.create(createItineraryDto, user.id);
  }

  @Get()
  findAllForUser(@GetUser() user: User) {
    return this.itineraryService.findAllForUser(user.id);
  }

  @Get('/:itineraryId')
  getItineraryById(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    return this.itineraryService.getItineraryById(itineraryId, user.id);
  }

  @Get('/:itineraryId/full')
  getItineraryWithPlanItems(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    return this.itineraryService.getItineraryWithPlanItems(itineraryId, user.id);
  }

  // 自动生成旅行攻略
  @Post('generate')
  @Public() // 添加Public装饰器，使该路由不需要认证
  generateItinerary(
    @Body() generateItineraryDto: GenerateItineraryDto,
    @GetUser() user: User,
  ) {
    // 临时解决方案：如果用户未认证，使用默认用户ID
    const userId = user?.id || 1; // 假设ID为1的是默认用户
    return this.itineraryService.generateItinerary(generateItineraryDto, userId);
  }

  // Add a new PlanItem to an Itinerary
  @Post('/:itineraryId/plan-items')
  addPlanItem(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
    @Body() createPlanItemDto: CreatePlanItemDto,
  ) {
    return this.itineraryService.addPlanItem(itineraryId, user.id, createPlanItemDto);
  }

  // Get all PlanItems for a specific date in an Itinerary
  @Get('/:itineraryId/plan-items')
  getPlanItemsForDate(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
    @Query('planDate') planDate: string,
  ) {
    return this.itineraryService.getPlanItemsForDate(itineraryId, user.id, planDate);
  }

  // Get the optimized route for a specific date
  @Get('/:itineraryId/route')
  getRouteForDate(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
    @Query('planDate') planDate: string,
  ) {
    return this.itineraryService.getRouteForDate(itineraryId, user.id, planDate);
  }
}
