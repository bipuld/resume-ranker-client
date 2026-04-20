export interface LoginPayload {
  email: string;
  password: string;
  fcm_token: string;
  device_type: string;
  device_name: string;
  device_id: string;
  role?: "candidate" | "recruiter" | "admin";
  invite_token?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  full_name: string;
  role: "candidate" | "recruiter";
  invite_token?: string;
}

export interface OtpVerifyPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
}

export interface ChangePasswordPayload {
  email?: string;
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AuthResponse {
  access?: string;
  refresh?: string;
  token?: string;
  message?: string;
  otp_required?: boolean;
  has_company?: boolean;
  hasCompany?: boolean;
  is_verified?: boolean;
  company_is_verified?: boolean;
  user?: {
    has_company?: boolean;
    hasCompany?: boolean;
    is_verified?: boolean;
    company?: {
      is_verified?: boolean;
    } | null;
  };
  company?: {
    is_verified?: boolean;
  } | null;
}

export interface ApiMessageResponse {
  message?: string;
}

