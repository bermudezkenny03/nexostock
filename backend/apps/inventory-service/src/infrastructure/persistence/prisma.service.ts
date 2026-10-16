import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaService } from '@nexostock/database';

@Injectable()
export class PrismaService extends createPrismaService(PrismaClient) {}
