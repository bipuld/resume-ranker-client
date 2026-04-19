import API from "./axiox";
import type { UpdateProfilePayload, UserProfile } from "../types/profile";

const PROFILE_ENDPOINT = "profile/";

const isFileLike = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const buildProfileRequestBody = (payload: UpdateProfilePayload) => {
  if (!isFileLike(payload.profile_image)) {
    return payload;
  }

  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (key === "profile_image" && isFileLike(value)) {
      formData.append(key, value);
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
};

type ProfileEnvelope = {
  user?: UserProfile;
  data?: UserProfile;
};

const isProfileRecord = (value: unknown): value is UserProfile =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasTopLevelProfileFields = (value: unknown) =>
  isProfileRecord(value) &&
  ("bio" in value ||
    "profile_image" in value ||
    "current_address" in value ||
    "permanent_address" in value ||
    "language" in value ||
    "created_at" in value ||
    "updated_at" in value ||
    "is_verified" in value);

const unwrapProfile = (payload: UserProfile | ProfileEnvelope): UserProfile => {
  if (hasTopLevelProfileFields(payload)) {
    return payload;
  }

  if ("data" in payload && isProfileRecord(payload.data)) {
    return payload.data;
  }

  if ("user" in payload && isProfileRecord(payload.user)) {
    return payload.user;
  }

  return payload as UserProfile;
};

export const getProfile = async (): Promise<UserProfile> => {
  const res = await API.get<UserProfile | ProfileEnvelope>(PROFILE_ENDPOINT);
  return unwrapProfile(res.data);
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const res = await API.put<UserProfile | ProfileEnvelope>(
    PROFILE_ENDPOINT,
    buildProfileRequestBody(payload),
  );
  return unwrapProfile(res.data);
};

export const patchProfile = async (payload: UpdateProfilePayload): Promise<UserProfile> => {
  const res = await API.patch<UserProfile | ProfileEnvelope>(
    PROFILE_ENDPOINT,
    buildProfileRequestBody(payload),
  );
  return unwrapProfile(res.data);
};
