export interface CreateCompanyPayload {
  // Company Basic Info
  name: string;
  logo?: File | string | null;
  website?: string;
  description: string;
  industry?: string;
  size?: string;
  company_size?: string;
  
  // Location
  location?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  
  // Company Contact
  email?: string;
  phone?: string;
  
  // Contact Person Details
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  contact_person_designation?: string;
}

export interface CompanyResponse {
  id?: string | number;
  name?: string;
  is_verified?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface CompanyDetailResponse extends CompanyResponse {
  logo?: string | null;
  website?: string;
  description?: string;
  industry?: string;
  size?: string;
  company_size?: string;
  location?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  email?: string;
  phone?: string;
  contact_person_name?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  contact_person_designation?: string;
}

export interface CompanyListResponse {
  results?: CompanyDetailResponse[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: unknown;
}

export interface CompanyStatusResponse {
  has_company?: boolean;
  hasCompany?: boolean;
  is_verified?: boolean;
  company?: {
    id?: string | number;
    name?: string;
    is_verified?: boolean;
  } | null;
  message?: string;
}

export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

export type CompanyMemberRole = "owner" | "hr" | "recruiter" | "interviewer";

export interface InviteCompanyMemberPayload {
  email: string;
  role?: CompanyMemberRole;
}

export interface UpdateCompanyMemberPayload {
  role: CompanyMemberRole;
}

export interface CompanyMember {
  id: string;
  company?: string;
  user?: string;
  email?: string;
  role: CompanyMemberRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CompanyInvite {
  id: string;
  company?: string;
  email: string;
  role?: CompanyMemberRole;
  token?: string;
  is_active?: boolean;
  expires_at?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface InviteActionResponse {
  message?: string;
  detail?: string;
  [key: string]: unknown;
}
