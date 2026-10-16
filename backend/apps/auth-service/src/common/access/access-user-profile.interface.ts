export interface AccessUserProfile {
  id: string;
  email: string;
  businessId: string;
  businessName: string;
  businessPrimaryColor: string | null;
  businessLogoUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
}
