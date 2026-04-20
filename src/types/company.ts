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

export type CompanyMemberRole = "owner" | "admin" | "hr" | "recruiter" | "interviewer";

export interface CompanyMemberPermissions {
  can_post_jobs: boolean;
  can_edit_jobs: boolean;
  can_delete_jobs: boolean;
  can_view_applicants: boolean;
  can_shortlist_candidates: boolean;
  can_manage_team: boolean;
}

export interface InviteCompanyMemberPayload {
  email: string;
  role?: CompanyMemberRole;
}

export interface UpdateCompanyMemberPayload {
  role?: CompanyMemberRole;
  designation?: string;
  can_post_jobs?: boolean;
  can_edit_jobs?: boolean;
  can_delete_jobs?: boolean;
  can_view_applicants?: boolean;
  can_shortlist_candidates?: boolean;
  can_manage_team?: boolean;
}

export interface CompanyMember {
  id: string;
  company?: string | number | { id?: string | number; name?: string };
  user?: string | number | { id?: string | number; email?: string };
  email?: string;
  invite_email?: string;
  role: CompanyMemberRole;
  invite_status?: string;
  is_owner?: boolean;
  is_approved?: boolean;
  is_active?: boolean;
  designation?: string;
  can_post_jobs?: boolean;
  can_edit_jobs?: boolean;
  can_delete_jobs?: boolean;
  can_view_applicants?: boolean;
  can_shortlist_candidates?: boolean;
  can_manage_team?: boolean;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface CompanyMembershipDetailsUser {
  id?: string | number;
  email?: string;
}

export interface CompanyMembershipDetailsCompany {
  id?: string | number;
  name?: string;
  location?: string | null;
  industry?: string | null;
  size?: string | null;
  is_verified?: boolean;
  logo?: string | null;
}

export interface CompanyMembershipDetailsItem {
  id?: string | number;
  role?: CompanyMemberRole;
  designation?: string | null;
  is_active?: boolean;
  invite_status?: string;
  is_owner?: boolean;
  company?: CompanyMembershipDetailsCompany;
}

export interface CompanyMembershipDetailsResponse {
  user?: CompanyMembershipDetailsUser;
  companies?: CompanyMembershipDetailsItem[];
}

export interface CompanyInvite {
  id: string;
  company?: string | number;
  email?: string;
  invite_email?: string;
  role?: CompanyMemberRole;
  invite_status?: string;
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
