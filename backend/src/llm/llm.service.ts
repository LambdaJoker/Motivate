import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AmapService } from '../amap/amap.service';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private progressMap = new Map<string, string[]>();

  constructor(private readonly amapService: AmapService) {
    // 默认配置为 DeepSeek 的 API (便宜、效果好，兼容 OpenAI 格式)
    // 如果用户需要换成小米或其他模型，只需在 .env 中修改 LLM_API_KEY 和 LLM_BASE_URL 即可
    this.openai = new OpenAI({
      apiKey: process.env.LLM_API_KEY, 
      baseURL: process.env.LLM_BASE_URL,
    });
  }

  // 使用 SearXNG (免费开源) 或 DuckDuckGo 等进行真实的互联网搜索
  private async searchSocialMedia(query: string, platform: 'xiaohongshu' | 'douyin' | 'all' = 'all') {
    this.logger.log(`[Tool] Real Web Searching for: ${query}`);
    try {
      // 为了稳定性和无需配置额外的 API Key，这里我们使用免费的开源 DuckDuckGo 搜索
      // 构造特定的搜索词以获取攻略和避坑指南
      let searchQuery = query;
      if (platform === 'xiaohongshu') {
        searchQuery = `site:xiaohongshu.com ${query}`;
      } else if (platform === 'douyin') {
        searchQuery = `site:douyin.com ${query}`;
      }

      // 使用 DuckDuckGo (免费无Key限制) 或者 Serper 等进行真实的互联网搜索
      // 注意：这里为了确保在 Node.js 环境中稳定可用，我们使用 DuckDuckGo Lite 版接口，或者如果遇到反爬，可以平滑降级。
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        // 设置超时时间防止卡死
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`DuckDuckGo returned status ${response.status}`);
      }
      
      const html = await response.text();
      
      // 使用正则从 DuckDuckGo 结果中粗略提取标题和摘要
      const results: any[] = [];
      const snippetRegex = /<a class="result__snippet[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
      const titleRegex = /<h2 class="result__title">[\s\S]*?<a[^>]*>(.*?)<\/a>/gi;
      
      let snippetMatch;
      let titleMatch;
      let count = 0;
      
      while ((snippetMatch = snippetRegex.exec(html)) !== null && count < 3) {
        titleMatch = titleRegex.exec(html); // 尝试同步获取标题
        
        // 简单清洗 HTML 标签和多余空格
        const snippet = snippetMatch[2].replace(/<[^>]+>/g, '').trim();
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : `${query}相关攻略`;
        
        if (snippet && snippet.length > 20) {
          results.push({
            source: platform,
            title: title,
            url: snippetMatch[1],
            content: snippet
          });
          count++;
        }
      }
      
      if (results.length > 0) {
        this.logger.log(`[Tool] Successfully fetched ${results.length} real results from DuckDuckGo`);
        return results;
      } else {
        // 如果搜不到（可能被反爬），返回基于大模型自身知识的保底建议指令
        this.logger.warn(`[Tool] DuckDuckGo returned 0 results, likely blocked or empty.`);
        return [{ content: `请基于你的知识库，为 ${query} 提供防踩雷建议和详细攻略。` }];
      }
    } catch (e: any) {
      this.logger.error(`Search API error: ${e.message}`);
      return [{ error: '实时搜索暂时不可用，请直接基于已有知识库和常识生成最专业的攻略和避坑指南。' }];
    }
  }

  // 获取天气预报工具函数 (真实调用高德API)
  private async getWeatherForecast(city: string) {
    this.logger.log(`[Tool] Getting real weather forecast for: ${city}`);
    try {
      // 1. 先通过高德地理编码API把城市名转成 adcode
      const geoResult = await this.amapService.geocode(city);
      if (!geoResult || !geoResult.adcode) {
        return { error: `无法获取城市 ${city} 的天气，请检查城市名称是否正确。` };
      }
      
      // 2. 使用 adcode 调用高德天气API (all表示返回未来几天的预报天气)
      const weatherData = await this.amapService.getWeather(geoResult.adcode);
      
      if (weatherData && weatherData.forecasts && weatherData.forecasts.length > 0) {
        const forecast = weatherData.forecasts[0];
        return {
          city: forecast.city,
          reportTime: forecast.reporttime,
          casts: forecast.casts.map((cast: any) => ({
            date: cast.date,
            dayWeather: cast.dayweather, // 白天天气现象，如“晴”、“多云”
            nightWeather: cast.nightweather, // 夜间天气现象
            dayTemp: cast.daytemp + '℃', // 白天温度
            nightTemp: cast.nighttemp + '℃', // 夜间温度
            dayWind: cast.daywind + '风 ' + cast.daypower + '级', // 白天风向和风力
            nightWind: cast.nightwind + '风 ' + cast.nightpower + '级' // 夜间风向和风力
          }))
        };
      }
      return { error: '获取天气数据失败' };
    } catch (e: any) {
      this.logger.error(`Weather API error: ${e.message}`);
      return { error: '天气API调用异常' };
    }
  }

  // 获取当地景点/美食推荐工具函数 (真实调用高德API)
  private async getLocalRecommendations(city: string, keyword: string) {
    this.logger.log(`[Tool] Getting real local recommendations for: ${city} - ${keyword}`);
    try {
      // 1. 先通过高德地理编码API把城市名转成 adcode 和 location (经纬度)
      const geoResult = await this.amapService.geocode(city);
      if (!geoResult || !geoResult.location) {
        return { error: `无法获取城市 ${city} 的地理信息。` };
      }
      
      // 2. 调用周边搜索 API 查找热门地点 (110000为风景名胜，050000为餐饮服务)
      let typeCode = '';
      if (keyword.includes('景点') || keyword.includes('风光') || keyword.includes('游玩') || keyword.includes('打卡')) {
        typeCode = '110000'; // 旅游景点
      } else if (keyword.includes('美食') || keyword.includes('餐厅') || keyword.includes('小吃') || keyword.includes('饭店') || keyword.includes('饭馆')) {
        typeCode = '050000'; // 餐饮服务
      } else if (keyword.includes('酒店') || keyword.includes('住宿') || keyword.includes('民宿') || keyword.includes('旅社')) {
        typeCode = '100000'; // 住宿服务
      } else if (keyword.includes('购物') || keyword.includes('商场') || keyword.includes('超市')) {
        typeCode = '060000'; // 购物服务
      }
      
      const searchResult = await this.amapService.findNearby(geoResult.location, keyword, typeCode, 15000); // 搜索半径扩大到15公里
      
      if (searchResult && Array.isArray(searchResult) && searchResult.length > 0) {
        return {
          city: city,
          recommendations: searchResult.slice(0, 5).map((poi: any) => ({
            name: poi.name,
            type: poi.type,
            address: poi.address,
            distance: poi.distance + '米',
            business_area: poi.business_area || '未知商圈',
            rating: poi.biz_ext?.rating || '暂无评分',
            cost: poi.biz_ext?.cost ? `人均￥${poi.biz_ext.cost}` : '价格未知'
          }))
        };
      }
      
      return { error: '未找到相关推荐地点' };
    } catch (e: any) {
      this.logger.error(`Amap search API error: ${e.message}`);
      return { error: '地点搜索API调用异常' };
    }
  }

  // 获取交通耗时和花费预估工具函数
  private async calculateRouteEstimate(originName: string, destinationName: string, mode?: string) {
    this.logger.log(`[Tool] Calculating route estimate from ${originName} to ${destinationName} via ${mode || 'auto'}`);
    try {
      const geoOrigin = await this.amapService.geocode(originName);
      const geoDest = await this.amapService.geocode(destinationName);
      
      if (!geoOrigin || !geoOrigin.location || !geoDest || !geoDest.location) {
        return { error: `无法解析地点坐标，请确认地点名称是否准确：${originName} 或 ${destinationName}` };
      }
      
      const routeInfo = await this.amapService.getIntercityRouteDetails(geoOrigin.location, geoDest.location, mode);
      
      return {
        origin: originName,
        destination: destinationName,
        distance_km: routeInfo.distance,
        estimated_duration_minutes: routeInfo.duration,
        estimated_cost_rmb: routeInfo.cost,
        recommended_vehicle: routeInfo.vehicle,
        notice: '以上时间包含进出站和安检时间，花费为该交通方式的平均预估价。'
      };
    } catch (e: any) {
      this.logger.error(`Route estimate API error: ${e.message}`);
      return { error: '路线计算异常' };
    }
  }

  getProgress(taskId: string): string[] {
    return this.progressMap.get(taskId) || [];
  }

  clearProgress(taskId: string) {
    this.progressMap.delete(taskId);
  }

  async generateItinerary(params: {
    origin: string;
    destination: string;
    startDate: string;
    durationDays: number;
    budget: number;
    mustVisitSpots: string[];
    transportMode: string;
    toDestinationTransportMode?: string;
    travelPreference?: string;
    fullPromptContext?: string;
    taskId?: string;
  }) {
    const prompt = `
你是一个专业的金牌旅游规划师。请根据用户的需求，规划一份详细、合理、无缝衔接的旅游行程。
本次行程规划核心任务：${params.fullPromptContext || `Generating itinerary for: ${params.destination}${params.durationDays}日游 from ${params.origin || 'N/A'} to ${params.destination} with budget ¥${params.budget || 0}`}

【用户需求】
出发地：${params.origin || '未指定'}
目的地：${params.destination}
出发日期：${params.startDate}
游玩天数：${params.durationDays}天
旅行偏好：${params.travelPreference || '无特别偏好'}
人均预算：${params.budget ? params.budget + '元' : '未限制'}
必去景点：${params.mustVisitSpots.join('、') || '无'}
前往目的地交通偏好：${params.toDestinationTransportMode === 'train' ? '火车' : params.toDestinationTransportMode === 'high_speed_train' ? '高铁' : params.toDestinationTransportMode === 'plane' ? '飞机' : params.toDestinationTransportMode === 'driving' ? '自驾' : '不限'}
当地出行偏好：${params.transportMode === 'driving' ? '自驾' : params.transportMode === 'walking' ? '徒步' : params.transportMode === 'transit' ? '公共交通' : params.transportMode === 'taxi' ? '打车' : '不限'}

【规划原则】
1. 核心目标：必须严格围绕用户的【旅行偏好】（如：${params.travelPreference || '无'}）来挑选景点、餐厅和安排行程节奏。
2. 预算控制（极度重要）：用户的预算是 ${params.budget ? params.budget + '元' : '无上限'}。你在选择餐厅、酒店、交通和收费景点时，必须严格计算花费，确保 \`totalEstimatedCost\`（所有项目的 \`estimatedCost\` 总和）绝对不能超过用户的总预算！如果预算较低，请多安排免费景点、公共交通和高性价比餐饮住宿。
3. 数据真实性与准确性（极度重要）：强烈建议在规划前，调用 \`getLocalRecommendations\` 获取当地真实的景点、餐厅和酒店名字及人均消费！绝对禁止编造虚假的店名。
4. 时间与价格计算（极度重要）：
   - 对于景点门票、餐饮、酒店等花费，你**必须**参考 \`getLocalRecommendations\` 返回的 \`cost\` (人均消费) 字段作为 \`estimatedCost\`。
   - 对于任何交通（包含城际交通如高铁/飞机，以及同城交通如打车/地铁），你**必须**调用 \`calculateRouteEstimate\` 工具来获取精准的 \`estimated_duration_minutes\` 和 \`estimated_cost_rmb\`，禁止随意编造时间和交通价格！
   - 最终输出的 \`totalEstimatedCost\` 必须是你安排的所有项目 \`estimatedCost\` 的总和！
5. 行程连贯性与返程规划：行程必须从出发地的交通开始。如果出发地和目的地不同，并且用户选择了多天游玩，必须在最后一天安排合理的返程交通。如果是自驾或途经多城，可以规划“一路玩回去”的顺路景点。如果同城游玩则不需要城际交通。
6. 每天结构：每天的行程必须包含：早上的景点、午餐、下午的景点、晚餐、入住酒店。
7. 节奏与时间：必须符合常理。调用 \`calculateRouteEstimate\` 确保景点间的交通时间真实可靠。每天晚上必须在22:00前安排回酒店休息。
8. 必去景点：用户填写的必去景点必须全部安排进去。如果时间有富裕，请补充当地最著名、且符合用户【旅行偏好】的特色景点。
9. 餐饮安排：必须推荐具体、真实的著名餐厅或小吃店名称。
10. 地理位置合理性：必须考虑到实际的地理位置，不要把相距很远的景点安排在同一天的相近时间。
11. 实用性与避坑：调用天气工具和社交媒体搜索工具，将天气预警、最新的避坑指南、拍照机位写入 \`description\` 字段中！

【输出格式】
请务必只输出合法的 JSON 格式，绝对不要包含任何 XML 标签、思考过程（如 <think> 或 <invoke>）或任何说明文字。
JSON 结构必须严格如下：
{
  "budgetAnalysis": "简要说明你将如何分配这笔预算（例如：酒店XX元，餐饮XX元，交通XX元，景点XX元），以确保绝对不超支。",
  "totalEstimatedCost": 1500, // 整体预估花费，必须严格小于或等于用户的总预算！
  "days": [
    {
      "date": "2025-06-30", // 格式 YYYY-MM-DD
      "dayNumber": 1,
      "items": [
        {
          "time": "08:00", // 格式 HH:mm
          "durationMinutes": 120, // 预计耗时(分钟)，必须是整数
          "title": "动作标题", // 例如：乘坐高铁前往目的地、游览某某景区、品尝某某美食
          "locationName": "具体地点", // 必须是真实存在的高德地图能搜到的具体 POI 名称！如果是交通，写目的地站；如果是景点，写具体的景点全称；如果是餐饮，必须写具体的餐厅或小吃店名字。不要写类似“无”、“特色餐厅”、“民宿”这种泛泛而谈的词汇。
          "type": "transport", // 必须是以下之一: transport, activity, food, accommodation
          "estimatedCost": 200, // 预估花费(元)，必须是整数，必须严格参考工具返回的 cost 或 estimated_cost_rmb 字段
          "description": "详细描述" // 结合旅行偏好、天气预报、真实周边地点评分和社交攻略，提供最具价值的建议，比如“该餐厅评分4.8，必点特色菜XXX”、“明天有雨，适合在室内游览”或“本地人建议避开正门网红机位排队”。
        }
      ]
    }
  ]
}
`;

    const addLog = (msg: string) => {
      if (params.taskId) {
        const logs = this.progressMap.get(params.taskId) || [];
        // 如果最后一条日志不是这个，就加进去，防止重复
        if (logs[logs.length - 1] !== msg) {
          logs.push(msg);
          this.progressMap.set(params.taskId, logs);
        }
      }
    };

    this.logger.log('Calling LLM to generate itinerary...');
    addLog('开始分析您的旅行需求...');
    
    try {
      // 定义大模型可以调用的工具(Function Calling)
      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "searchSocialMedia",
            description: "在小红书、抖音等社交平台上搜索目的地的旅游攻略、避坑指南或美食推荐。",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "搜索关键词，例如：'三亚 必吃美食' 或 '五台山 避坑攻略'"
                },
                platform: {
                  type: "string",
                  enum: ["xiaohongshu", "douyin", "all"],
                  description: "要搜索的社交平台"
                }
              },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getWeatherForecast",
            description: "获取目标城市的近期天气预报，以便合理安排室内和室外行程，避免在雨天安排爬山或海边游玩。",
            parameters: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "城市名称，例如：'三亚' 或 '北京'"
                }
              },
              required: ["city"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getLocalRecommendations",
            description: "获取目标城市周边真实的景点、美食、酒店推荐信息及人均消费价格（基于高德地图）。当需要寻找真实的、有评分和人均消费参考的具体地点时调用此工具。",
            parameters: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "城市名称，例如：'三亚' 或 '北京'"
                },
                keyword: {
                  type: "string",
                  description: "搜索关键词，例如：'特色美食'、'海景酒店'、'网红打卡景点'"
                }
              },
              required: ["city", "keyword"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "calculateRouteEstimate",
            description: "精确计算两个地点之间的交通时间（分钟）和花费（人民币）。无论是同城短途还是跨城长途交通，都必须调用此工具以获取真实准确的耗时与价格！",
            parameters: {
              type: "object",
              properties: {
                originName: {
                  type: "string",
                  description: "出发地点具体名称，必须是真实的城市或景点名，不能是 undefined。例如：'北京南站' 或 '三亚凤凰机场' 或 '亚龙湾'"
                },
                destinationName: {
                  type: "string",
                  description: "到达地点具体名称，必须是真实的城市或景点名，不能是 undefined。例如：'三亚凤凰机场' 或 '天涯海角'"
                },
                mode: {
                  type: "string",
                  description: "交通方式偏好（plane, high_speed_train, train, driving, taxi, transit, walking）。如果是前往目的地的大交通，请传入用户指定的前往目的地交通偏好；如果是同城接驳，请传入当地出行偏好。",
                  enum: ["plane", "high_speed_train", "train", "driving", "taxi", "transit", "walking"]
                }
              },
              required: ["originName", "destinationName"]
            }
          }
        }
      ];

      // 添加重试机制，最多重试 3 次
      let retries = 3;
      let finalContent: string | null = null;

      // 【新增】处理 MiniMax 等模型将 tool_call 放在 content 里的问题
      const normalizeMiniMaxToolCalls = (msg: any) => {
        if (!msg.tool_calls && msg.content && msg.content.includes('<invoke')) {
          // 修改为更稳健的正则表达式，匹配任意空白字符，包含换行符
          const invokeRegex = /<invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/invoke>/g;
          let match;
          const toolCalls: any[] = []; // 明确指定类型为 any[] 解决 TS2345 报错
          while ((match = invokeRegex.exec(msg.content)) !== null) {
            const functionName = match[1];
            const paramsString = match[2];
            const paramRegex = /<parameter\s+name="([^"]+)"\s*>([\s\S]*?)<\/parameter>/g;
            let paramMatch;
            const args: any = {};
            while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
              args[paramMatch[1]] = paramMatch[2].trim();
            }
            toolCalls.push({
              id: 'call_' + Math.random().toString(36).substring(7),
              type: 'function',
              function: { name: functionName, arguments: JSON.stringify(args) }
            });
          }
          if (toolCalls.length > 0) {
            msg.tool_calls = toolCalls;
          }
        }
      };

      while (retries > 0) {
        try {
          // 第一次调用大模型，附带工具定义
          let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: 'user', content: prompt }
          ];

          const requestParams: any = {
            model: process.env.LLM_MODEL_NAME || 'deepseek-chat',
            messages: messages,
            temperature: 0.7,
            max_tokens: 4000,
          };

          // 部分国产大模型（如旧版小米/MiniMax某些版本）在 function calling 上存在兼容性或幻觉问题，容易返回非法的 XML 标签
          // 我们在这里为 MiniMax 和可能存在幻觉的模型做稳健性处理
          requestParams.tools = tools;
          requestParams.tool_choice = "auto";
          
          // 对于 MiniMax，不要在有 tools 的情况下强制 response_format
          if (!process.env.LLM_BASE_URL?.includes('minimaxi') && !process.env.LLM_BASE_URL?.includes('xiaomimimo')) {
            requestParams.response_format = { type: 'json_object' };
          }

          let response = await this.openai.chat.completions.create(requestParams);

          // 处理模型的工具调用请求
          let responseMessage = response.choices[0].message;
          
          // 适配 MiniMax 的 XML 工具调用格式
          normalizeMiniMaxToolCalls(responseMessage);
          
          // 限制最大工具调用次数，防止死循环
          let maxToolCalls = 30;

          // 当模型决定调用工具时
          while (responseMessage.tool_calls && maxToolCalls > 0) {
            messages.push(responseMessage); // 将模型的请求加入历史对话
            
            for (const toolCall of responseMessage.tool_calls) {
              let args;
              let rawArgs = (toolCall as any).function.arguments;
              if (rawArgs.includes('{') && rawArgs.includes('}')) {
                const firstBrace = rawArgs.indexOf('{');
                const lastBrace = rawArgs.lastIndexOf('}');
                rawArgs = rawArgs.substring(firstBrace, lastBrace + 1);
              }
              try {
                args = JSON.parse(rawArgs);
              } catch (e) {
                this.logger.warn(`Failed to parse tool arguments: ${rawArgs}`);
                args = {}; 
              }

              let toolResult;
              if (toolCall.type === 'function') {
                if (toolCall.function.name === 'searchSocialMedia') {
                  addLog(`正在全网搜索攻略与避坑指南: ${args.query || params.destination}`);
                  toolResult = await this.searchSocialMedia(args.query || params.destination, args.platform || 'all');
                } else if (toolCall.function.name === 'getWeatherForecast') {
                  addLog(`正在查询当地天气预报: ${args.city || params.destination}`);
                  toolResult = await this.getWeatherForecast(args.city || params.destination);
                } else if (toolCall.function.name === 'getLocalRecommendations') {
                  const searchCity = args.city && args.city !== 'undefined' ? args.city : params.destination;
                  addLog(`正在查询真实${args.keyword || '地点'}与价格: ${searchCity}`);
                  toolResult = await this.getLocalRecommendations(searchCity, args.keyword || '景点');
                } else if (toolCall.function.name === 'calculateRouteEstimate') {
                  const origin = args.originName && args.originName !== 'undefined' ? args.originName : params.origin || params.destination;
                  const dest = args.destinationName && args.destinationName !== 'undefined' ? args.destinationName : params.destination;
                  addLog(`正在精确计算路线时间与交通花费: ${origin} 到 ${dest}`);
                  toolResult = await this.calculateRouteEstimate(origin, dest, args.mode);
                } else {
                  toolResult = { error: 'Unknown tool' };
                }
              }

              // 将工具的执行结果返回给大模型
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult),
              });
            }
            
            // 带着工具的执行结果，再次向大模型发起请求，并要求最终输出 JSON
            // 注意：部分国产大模型调用工具后可能会不支持严格的 response_format
            addLog('正在综合信息并生成最终行程安排...');
            const secondRequestParams: any = {
              model: process.env.LLM_MODEL_NAME || 'deepseek-chat',
              messages: messages,
              temperature: 0.7,
            };
            
            // 只有非特殊大模型才附加 json_object
            if (!process.env.LLM_BASE_URL?.includes('xiaomimimo') && !process.env.LLM_BASE_URL?.includes('minimaxi')) {
              secondRequestParams.response_format = { type: 'json_object' };
            }
            
            response = await this.openai.chat.completions.create(secondRequestParams);
            
            responseMessage = response.choices[0].message;
            
            // 适配 MiniMax 的 XML 工具调用格式
            normalizeMiniMaxToolCalls(responseMessage);
            
            maxToolCalls--;
          }
          
          // 如果达到了最大工具调用次数，但模型依然想调用工具，强制它输出结果
          if (responseMessage.tool_calls) {
            this.logger.warn('Reached maximum tool calls limit. Forcing final JSON output.');
            messages.push(responseMessage);
            messages.push({
              role: 'user',
              content: '工具调用次数已达上限，请立即停止调用任何工具，并根据已知信息输出最终的 JSON 格式行程规划。不要包含任何 <invoke> 或 <tool_call> 标签。'
            });
            const forceRequestParams: any = {
              model: process.env.LLM_MODEL_NAME || 'deepseek-chat',
              messages: messages,
              temperature: 0.7,
            };
            if (!process.env.LLM_BASE_URL?.includes('xiaomimimo') && !process.env.LLM_BASE_URL?.includes('minimaxi')) {
              forceRequestParams.response_format = { type: 'json_object' };
            }
            response = await this.openai.chat.completions.create(forceRequestParams);
            responseMessage = response.choices[0].message;
          }

          // 如果模型没有调用工具，或者工具调用流程结束，这里就是最终的文本回复
          finalContent = responseMessage.content;
          
          if (!finalContent) {
            throw new Error('LLM returned empty content');
          }

          // 【新增】将大模型的原始输出完整打印到控制台，方便调试查看原始回答
          this.logger.log(`\n========== RAW LLM OUTPUT START ==========\n${finalContent}\n========== RAW LLM OUTPUT END ==========\n`);

          // 尝试解析 JSON，如果成功则跳出重试循环
          let cleanContent = finalContent.trim();
          
          // 移除各类大模型的思考过程和工具调用 XML 标签 (包含内部可能导致解析错误的 JSON 括号)
          cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/g, '');
          cleanContent = cleanContent.replace(/<minimax:thinking>[\s\S]*?<\/minimax:thinking>/g, '');
          cleanContent = cleanContent.replace(/<minimax:tool_call>[\s\S]*?<\/minimax:tool_call>/g, '');
          cleanContent = cleanContent.replace(/<invoke[\s\S]*?<\/invoke>/g, '');
          cleanContent = cleanContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '');
          
          // 再移除可能存在的 markdown 代码块包裹
          cleanContent = cleanContent.replace(/```json/g, '').replace(/```/g, '').trim();
          
          // 最稳健的 JSON 提取方式：
          // 找到最外层的 `{` 和 `}`，提取中间的内容进行解析
          
          const firstBrace = cleanContent.indexOf('{');
          const lastBrace = cleanContent.lastIndexOf('}');
          
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
          } else {
            throw new Error('LLM output does not contain valid JSON object braces: {}');
          }
          
          // 强制移除控制字符等可能导致 JSON.parse 失败的隐藏字符
          // 修复：保留中文标点、引号等，只移除真正的不可见控制字符，避免误删导致 JSON 格式错误
          cleanContent = cleanContent.replace(/[\u0000-\u0019]+/g, "");
          
          // 修复 MiniMax 等模型容易出现的 JSON 标点符号幻觉 (如 "estimatedCost":": 50,)
          cleanContent = cleanContent.replace(/":":\s*/g, '": ');
          
          const parsedJSON = JSON.parse(cleanContent);
          
          // 简单的数据结构校验
          if (!parsedJSON.days || !Array.isArray(parsedJSON.days)) {
            throw new Error('LLM output missing "days" array');
          }

          // 保底清理 null/undefined
          for (const day of parsedJSON.days) {
            for (const item of day.items) {
              if (!item.estimatedCost) item.estimatedCost = 0;
              if (!item.durationMinutes) item.durationMinutes = 60;
              if (!item.locationName || item.locationName === 'undefined') item.locationName = params.destination;
            }
          }
          
          this.logger.log('LLM successfully generated and parsed the itinerary.');
          addLog('行程生成完毕，正在保存...');
          return parsedJSON;

        } catch (innerError) {
          this.logger.warn(`LLM generation attempt failed. Retries left: ${retries - 1}. Error: ${innerError.message}`);
          addLog(`遇到小问题，正在进行第 ${4 - retries} 次重试...`);
          retries--;
          if (retries === 0) {
            throw innerError; // 如果重试次数用尽，向上抛出错误
          }
          // 等待一小段时间后重试
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      this.logger.error('Failed to generate itinerary with LLM after retries:', error);
      throw new Error('大模型生成行程失败，请检查 API 配置或稍后再试');
    }
  }
}
