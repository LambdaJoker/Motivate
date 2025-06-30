/*
 * @Author: taotaozi-pro 2667534364@qq.com
 * @Date: 2025-06-30 08:16:41
 * @LastEditors: taotaozi-pro 2667534364@qq.com
 * @LastEditTime: 2025-06-30 08:18:13
 * @FilePath: \Motivate\backend\prisma\seed.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { PrismaClient } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 检查默认用户是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { username: 'demo' },
  });

  if (!existingUser) {
    // 创建默认用户
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    await prisma.user.create({
      data: {
        username: 'demo',
        email: 'demo@example.com',
        passwordHash: hashedPassword,
      },
    });
    
    console.log('Demo user created.');
  } else {
    console.log('Demo user already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 