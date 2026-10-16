import { NotFoundException } from '@nestjs/common';
import { InternalService } from './internal.service';

describe('InternalService', () => {
  const prisma = {
    business: { findUnique: jest.fn() },
  };
  const service = new InternalService(prisma as never);

  it('returns the plan limits other services enforce', async () => {
    prisma.business.findUnique.mockResolvedValue({
      id: 'biz-1',
      isActive: true,
      planCode: 'FREE',
      plan: { name: 'Gratis', maxProducts: 50 },
    });

    await expect(service.getBusinessStatus('biz-1')).resolves.toEqual({
      id: 'biz-1',
      isActive: true,
      planCode: 'FREE',
      planName: 'Gratis',
      maxProducts: 50,
    });
  });

  it('hides businesses that do not exist', async () => {
    prisma.business.findUnique.mockResolvedValue(null);
    await expect(service.getBusinessStatus('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
