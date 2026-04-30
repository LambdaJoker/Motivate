# ==========================================
# 基于大模型(LLM)的行程规划脚本 (Python版)
# ==========================================
# 这个脚本是为满足您对 "可以使用 Python 吗？" 的需求而提供的一个独立参考示例。
# 实际项目中，我们为了保持架构的统一性和高性能，已经在后端的 NestJS (TypeScript) 中
# 直接集成了相同逻辑的 LLM 调用 (参见 src/llm/llm.service.ts)。
#
# 如果您想独立测试这个 Python 脚本，请先执行:
# pip install openai requests python-dotenv
# ==========================================

import os
import json
import argparse
from openai import OpenAI

# 从环境变量中读取，如果没有则使用默认配置
# 小米大模型如果没有标准公网API，这里默认填入兼容 OpenAI 接口的便宜模型(如 DeepSeek)
LLM_API_KEY = os.getenv("LLM_API_KEY", "your-api-key-here")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com")
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "deepseek-chat")

client = OpenAI(api_key=LLM_API_KEY, base_url=LLM_BASE_URL)

def generate_itinerary(params_json_str):
    """
    根据传入的 JSON 参数字符串，调用大模型生成行程
    """
    try:
        params = json.loads(params_json_str)
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON input"}))
        return

    # 提取参数
    origin = params.get("origin", "未指定")
    destination = params.get("destination", "未指定")
    start_date = params.get("startDate", "2025-01-01")
    duration_days = params.get("durationDays", 3)
    budget = params.get("budget", "未限制")
    must_visit_spots = "、".join(params.get("mustVisitSpots", []))
    transport_mode = "自驾" if params.get("transportMode") == "driving" else "公共交通/打车"

    # 构造提示词 (与 TypeScript 版本保持一致)
    prompt = f"""
你是一个专业的金牌旅游规划师。请根据用户的需求，规划一份详细、合理、无缝衔接的旅游行程。

【用户需求】
出发地：{origin}
目的地：{destination}
出发日期：{start_date}
游玩天数：{duration_days}天
人均预算：{budget}
必去景点：{must_visit_spots}
交通偏好：{transport_mode}

【规划原则】
1. 行程必须从出发地的交通开始（如飞机/高铁/自驾），到最后一天返回结束。
2. 每天的行程必须包含：早上的景点、午餐、下午的景点、晚餐、入住酒店。
3. 时间安排必须符合常理，考虑景点间的交通时间（默认预留30-60分钟）。
4. 必去景点必须全部安排进去。如果时间有富裕，请补充当地最著名、顺路的特色景点。
5. 餐饮请推荐当地特色美食或具体著名餐厅名称。
6. 必须考虑到实际的地理位置，不要把相距很远的景点安排在同一天的相近时间。

【输出格式】
请务必只输出合法的 JSON 格式，不要包含任何 Markdown 标记（如 ```json）或其他说明文字。
JSON 结构必须严格如下：
{{
  "totalEstimatedCost": 1500,
  "days": [
    {{
      "date": "2025-06-30",
      "dayNumber": 1,
      "items": [
        {{
          "time": "08:00", // 格式 HH:mm
          "durationMinutes": 120, // 预计耗时(分钟)
          "title": "乘坐高铁前往目的地", // 动作标题
          "locationName": "太原南站", // 地点名称：如果是交通，写目的地站；如果是景点，写景点名；如果是餐饮，写餐厅名或“特色餐厅”
          "type": "transport", // 必须是以下之一: transport, activity, food, accommodation
          "estimatedCost": 200, // 预估花费(元)
          "description": "从出发地乘坐高铁前往目的地" // 详细描述
        }}
      ]
    }}
  ]
}}
"""

    try:
        response = client.chat.completions.create(
            model=LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": "你是一个只输出 JSON 格式的旅游规划机器人。"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        content = response.choices[0].message.content
        print(content)  # 直接输出大模型生成的 JSON 给 Node.js 或控制台读取

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate itinerary using LLM")
    parser.add_argument("--params", type=str, required=True, help="JSON string of itinerary parameters")
    args = parser.parse_args()
    
    generate_itinerary(args.params)
