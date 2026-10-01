export interface AccessUserProfile {
  id: string;
  email: string;
  businessId: string;
  businessName: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
}
