import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;

  constructor() {
    // 默认配置为 DeepSeek 的 API (便宜、效果好，兼容 OpenAI 格式)
    // 如果用户需要换成小米或其他模型，只需在 .env 中修改 LLM_API_KEY 和 LLM_BASE_URL 即可
    this.openai = new OpenAI({
      apiKey: process.env.LLM_API_KEY, 
      baseURL: process.env.LLM_BASE_URL,
    });
  }

  // 模拟的社交平台搜索工具函数 (小红书/抖音等)
  // 在实际生产中，可以对接第三方爬虫API或者官方API
  private async searchSocialMedia(query: string, platform: 'xiaohongshu' | 'douyin' | 'all' = 'all') {
    this.logger.log(`[Tool] Searching ${platform} for: ${query}`);
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 这里返回模拟的热门数据，作为大模型的上下文补充
    return [
      {
        platform: '小红书',
        title: `${query}避坑指南，亲测好用！`,
        content: `去${query}一定要注意这几点：1. 最好早上9点前去，人少好出片；2. 附近的那家老字号餐厅必打卡，人均只要50；3. 晚上的夜景比白天更好看。`,
        likes: 12500
      },
      {
        platform: '抖音',
        title: `${query}一日游特种兵攻略`,
        content: `带你用最少的钱玩转${query}！核心路线：先去南门打卡，然后顺着主路走到底。避雷：不要在景区里买特产，外面便宜一半。`,
        likes: 89000
      }
    ];
  }

  async generateItinerary(params: {
    origin: string;
    destination: string;
    startDate: string;
    durationDays: number;
    budget: number;
    mustVisitSpots: string[];
    transportMode: string;
    fullPromptContext?: string;
  }) {
    const prompt = `
你是一个专业的金牌旅游规划师。请根据用户的需求，规划一份详细、合理、无缝衔接的旅游行程。
本次行程规划核心任务：${params.fullPromptContext || `Generating itinerary for: ${params.destination}${params.durationDays}日游 from ${params.origin || 'N/A'} to ${params.destination} with budget ¥${params.budget || 0}`}

【用户需求】
出发地：${params.origin || '未指定'}
目的地：${params.destination}
出发日期：${params.startDate}
游玩天数：${params.durationDays}天
人均预算：${params.budget ? params.budget + '元' : '未限制'}
必去景点：${params.mustVisitSpots.join('、') || '无'}
交通偏好：${params.transportMode === 'driving' ? '自驾' : params.transportMode === 'walking' ? '徒步' : '公共交通/打车'}

【规划原则】
1. 行程必须从出发地的交通开始（如飞机/高铁/自驾），到最后一天返回结束。如果同城游玩则不需要城际交通。
2. 每天的行程必须包含：早上的景点、午餐、下午的景点、晚餐、入住酒店。
3. 时间安排必须符合常理，考虑景点间的交通时间（默认预留30-60分钟）。每天晚上必须在22:00前安排回酒店休息。
4. 必去景点必须全部安排进去。如果时间有富裕，请补充当地最著名、顺路的特色景点。
5. 餐饮请推荐当地特色美食或具体著名餐厅名称。
6. 必须考虑到实际的地理位置，不要把相距很远的景点安排在同一天的相近时间。
7. 为了让行程更生动，你可以调用工具搜索小红书/抖音，把避坑指南或美食推荐写入 \`description\` 字段中！

【输出格式】
请务必只输出合法的 JSON 格式，绝对不要包含任何 XML 标签、思考过程（如 <think> 或 <invoke>）或任何说明文字。
JSON 结构必须严格如下：
{
  "totalEstimatedCost": 1500, // 整体预估花费
  "days": [
    {
      "date": "2025-06-30", // 格式 YYYY-MM-DD
      "dayNumber": 1,
      "items": [
        {
          "time": "08:00", // 格式 HH:mm
          "durationMinutes": 120, // 预计耗时(分钟)，必须是整数
          "title": "乘坐高铁前往目的地", // 动作标题
          "locationName": "太原南站", // 地点名称：如果是交通，写目的地站；如果是景点，写景点名；如果是餐饮，写餐厅名或“特色餐厅”
          "type": "transport", // 必须是以下之一: transport, activity, food, accommodation
          "estimatedCost": 200, // 预估花费(元)，必须是整数
          "description": "从出发地乘坐高铁前往目的地。避坑：最好提前半小时到站。" // 详细描述，可包含社交平台搜到的攻略
        }
      ]
    }
  ]
}
`;

    this.logger.log('Calling LLM to generate itinerary...');
    
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
          let maxToolCalls = 10;

          // 当模型决定调用工具时
          while (responseMessage.tool_calls && maxToolCalls > 0) {
            messages.push(responseMessage); // 将模型的请求加入历史对话
            
            for (const toolCall of responseMessage.tool_calls) {
              if (toolCall.type === 'function' && toolCall.function.name === 'searchSocialMedia') {
                let args;
                
                // 处理一些模型（特别是小米/MiniMax）在返回的 arguments 里可能带有多余转义字符的问题
                let rawArgs = toolCall.function.arguments;
                // 如果发现非法的开头（如 XML/HTML 标签混入，比如 <tool_call>{...}</tool_call>），尝试修复
                if (rawArgs.includes('{') && rawArgs.includes('}')) {
                  const firstBrace = rawArgs.indexOf('{');
                  const lastBrace = rawArgs.lastIndexOf('}');
                  rawArgs = rawArgs.substring(firstBrace, lastBrace + 1);
                }
                
                try {
                  args = JSON.parse(rawArgs);
                } catch (e) {
                  this.logger.warn(`Failed to parse tool arguments: ${rawArgs}`);
                  args = { query: params.destination, platform: 'all' }; // 解析失败时的 fallback
                }
                
                // 执行真实的本地工具函数
                const toolResult = await this.searchSocialMedia(args.query, args.platform);
                
                // 将工具的执行结果返回给大模型
                messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(toolResult),
                });
              }
            }
            
            // 带着工具的执行结果，再次向大模型发起请求，并要求最终输出 JSON
            // 注意：部分国产大模型调用工具后可能会不支持严格的 response_format
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
          
          this.logger.log('LLM successfully generated and parsed the itinerary.');
          return parsedJSON;

        } catch (innerError) {
          this.logger.warn(`LLM generation attempt failed. Retries left: ${retries - 1}. Error: ${innerError.message}`);
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
