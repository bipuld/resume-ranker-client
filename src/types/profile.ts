export interface UserProfile {
  id?: string | number;
  email?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  username?: string;
  role?: string;
  bio?: string;
  profile_image?: string | null;
  gender?: string | null;
  dob?: string | null;
  current_address?: string | null;
  permanent_address?: string | null;
  language?: string | null;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  user?: ProfileUser | string;
}

export interface ProfileUser {
  id?: string | number;
  email?: string;
  username?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  phone?: string;
  role?: string;
  is_email_verified?: boolean;
  is_phone_verified?: boolean;
  is_verified?: boolean;
}

export type UpdateProfilePayload = Partial<
  Pick<UserProfile, "first_name" | "middle_name" | "last_name" | "full_name" | "phone" | "bio" | "gender" | "dob" | "current_address" | "permanent_address" | "language">
> & {
  profile_image?: File | null | undefined;
};
