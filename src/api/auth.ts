import API from "./axiox";
import type {
    ApiMessageResponse,
    AuthResponse,
    ChangePasswordPayload,
    LoginPayload,
    RegisterPayload,
    SignupPayload,
    OtpVerifyPayload,
    ResendOtpPayload,
    ResetPasswordPayload,
} from "../types/auth";

const AUTH_ENDPOINTS = {
    login: "user/login/",
    signup: "user/signup/",
    resendOtp: "user/resend-otp/",
    register: "user/register/",
    reset: "user/reset/",
    changePassword: "user/password/change/",
} as const;

const VERIFY_OTP_URL = "http://localhost:8000/verify-otp/";

const postData = async <TResponse, TPayload>(url: string, payload: TPayload) => {
    const res = await API.post<TResponse>(url, payload);
    return res.data;
};

export const loginUser = async (data: LoginPayload) => {
    return postData<AuthResponse, LoginPayload>(AUTH_ENDPOINTS.login, data);
};

export const registerUser = async (data: RegisterPayload) => {
    return postData<AuthResponse, RegisterPayload>(AUTH_ENDPOINTS.register, data);
};

export const signupUser = async (data: SignupPayload) => {
    return postData<ApiMessageResponse, SignupPayload>(AUTH_ENDPOINTS.signup, data);
};

export const verifyLoginOtp = async (data: OtpVerifyPayload) => {
    return postData<AuthResponse, OtpVerifyPayload>(VERIFY_OTP_URL, data);
};

export const resendOtp = async (data: ResendOtpPayload) => {
    return postData<ApiMessageResponse, ResendOtpPayload>(AUTH_ENDPOINTS.resendOtp, data);
};

export const requestPasswordReset = async (data: ResetPasswordPayload) => {
    return postData<ApiMessageResponse, ResetPasswordPayload>(AUTH_ENDPOINTS.reset, data);
};

export const changePassword = async (data: ChangePasswordPayload) => {
    return postData<ApiMessageResponse, ChangePasswordPayload>(
        AUTH_ENDPOINTS.changePassword,
        data,
    );
};
