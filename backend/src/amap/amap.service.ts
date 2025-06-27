/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-26 08:05:40
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-26 08:19:51
 * @FilePath: \Motivate\backend\src\amap\amap.service.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class AmapService {
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    const apiKey = this.configService.get<string>('AMAP_KEY');
    if (!apiKey) {
      throw new Error('AMAP_KEY is not defined. Please check your .env file.');
    }
    this.apiKey = apiKey;
  }

  async search(keywords: string): Promise<AxiosResponse<any>> {
    const url = 'https://restapi.amap.com/v3/place/text';
    const params = {
      key: this.apiKey,
      keywords,
      offset: 20,
      page: 1,
      extensions: 'all',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );
      return response.data;
    } catch (error) {
      // In a real app, you'd want to handle this error more gracefully
      console.error('Error calling Amap API:', error);
      throw new Error('Failed to fetch data from Amap API.');
    }
  }
}
