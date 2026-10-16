import { Injectable } from '@nestjs/common';
import { PrismaService } from './infrastructure/persistence/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<{ status: string; service: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'sales' };
  }
}
