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
  @Public() // 允许未登录获取列表
  findAllForUser(@GetUser() user: User) {
    const userId = user?.id || 1; // 添加临时用户ID支持
    return this.itineraryService.findAllForUser(userId);
  }

  @Get('/:itineraryId')
  getItineraryById(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    return this.itineraryService.getItineraryById(itineraryId, user.id);
  }

  @Get('/:itineraryId/full')
  @Public() // 添加Public装饰器，临时支持免登录访问
  getItineraryWithPlanItems(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    const userId = user?.id || 1; // 临时解决方案：如果未登录使用默认用户ID
    return this.itineraryService.getItineraryWithPlanItems(itineraryId, userId);
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

  // 重新生成旅行攻略 (根据原参数)
  @Post('/:itineraryId/regenerate')
  @Public()
  async regenerateItinerary(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    const userId = user?.id || 1;
    
    // 1. 获取原行程及参数
    // 我们需要告诉 service 不要进行严格的用户权限校验（或者传入 checkAuth = false），因为 Public 路由可能没有真实 userId
    const oldItinerary = await this.itineraryService.getItineraryById(itineraryId, userId, userId !== 1);
    if (!oldItinerary.generationParams) {
      throw new Error('The itinerary was not generated with parameters or parameters are lost.');
    }
    
    const params: GenerateItineraryDto = JSON.parse(oldItinerary.generationParams);
    
    // 2. 使用原参数并传入 ID 以实现原地更新
    return this.itineraryService.generateItinerary(params, userId, itineraryId);
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
  @Public() // 添加Public装饰器，临时支持免登录访问
  getPlanItemsForDate(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
    @Query('planDate') planDate: string,
  ) {
    const userId = user?.id || 1; // 临时解决方案：如果未登录使用默认用户ID
    return this.itineraryService.getPlanItemsForDate(itineraryId, userId, planDate);
  }

  // Get the optimized route for a specific date
  @Get('/:itineraryId/route')
  @Public() // 添加Public装饰器，临时支持免登录访问
  getRouteForDate(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
    @Query('planDate') planDate: string,
  ) {
    const userId = user?.id || 1; // 临时解决方案：如果未登录使用默认用户ID
    return this.itineraryService.getRouteForDate(itineraryId, userId, planDate);
  }

  // Delete an itinerary
  @Post('/:itineraryId/delete')
  @Public()
  async deleteItinerary(
    @Param('itineraryId', ParseIntPipe) itineraryId: number,
    @GetUser() user: User,
  ) {
    const userId = user?.id || 1; // 临时解决方案：如果未登录使用默认用户ID
    return this.itineraryService.deleteItinerary(itineraryId, userId);
  }
}
