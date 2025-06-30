/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-30 08:19:35
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 08:24:22
 * @FilePath: \Motivate\setup.bat
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
@echo on

REM 创建.env文件
echo # 数据库连接 > .\backend\.env
echo DATABASE_URL="postgresql://postgres:postgres@localhost:5432/travel_planner" >> .\backend\.env
echo. >> .\backend\.env
echo # JWT密钥 >> .\backend\.env
echo JWT_SECRET="travel-planner-secret-key-123456" >> .\backend\.env
echo. >> .\backend\.env
echo # 高德地图API密钥 >> .\backend\.env
echo AMAP_KEY="your-amap-key-here" >> .\backend\.env

REM 安装后端依赖
cd backend
call npm install

REM 生成Prisma客户端
call npx prisma generate

REM 运行数据库迁移
call npx prisma migrate dev --name init

REM 运行种子脚本
call npm run prisma:seed

REM 回到根目录
cd ..

REM 安装前端依赖
cd frontend
call npm install

REM 回到根目录
cd ..

echo 安装完成！
echo 使用以下命令启动应用：
echo 后端: cd backend ^&^& npm run start:dev
echo 前端: cd frontend ^&^& npm run dev

pause 