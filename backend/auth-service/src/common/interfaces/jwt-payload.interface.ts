export interface JwtPayload {
  sub: string;
  email: string;
  businessId: string;
  roles: string[];
  permissions: string[];
}
