export class PlanLimitReached extends Error {
  constructor(
    readonly planName: string,
    readonly maxProducts: number,
  ) {
    super(
      `Tu plan ${planName} permite hasta ${maxProducts} productos activos. Cambia de plan para agregar más.`,
    );
    this.name = 'PlanLimitReached';
  }
}

export function assertProductSlot(
  activeProducts: number,
  maxProducts: number | null,
  planName: string,
): void {
  if (maxProducts !== null && activeProducts >= maxProducts) {
    throw new PlanLimitReached(planName, maxProducts);
  }
}
