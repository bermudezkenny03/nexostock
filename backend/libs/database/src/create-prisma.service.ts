import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

export interface Connectable {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
}

export function createPrismaService<T extends Connectable>(Client: new () => T): new () => T {
  @Injectable()
  class PrismaService
    extends (Client as new () => Connectable)
    implements OnModuleInit, OnModuleDestroy
  {
    async onModuleInit(): Promise<void> {
      await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
      await this.$disconnect();
    }
  }

  return PrismaService as unknown as new () => T;
}
