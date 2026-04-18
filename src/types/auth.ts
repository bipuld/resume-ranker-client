export interface LoginPayload {
  email: string;
  password: string;
  fcm_token: string;
  device_type: string;
  device_name: string;
  device_id: string;
  role?: "candidate" | "recruiter" | "admin";
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
  role: string;  // Hidden field - automatically sent as 'candidate'
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
  old_password: string;
  new_password: string;
}

export interface AuthResponse {
  access?: string;
  refresh?: string;
  token?: string;
  message?: string;
  otp_required?: boolean;
}

export interface ApiMessageResponse {
  message?: string;
}

