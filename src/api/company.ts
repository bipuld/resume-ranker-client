import API from "./axiox";
import type {
  CompanyInvite,
  CompanyDetailResponse,
  CompanyListResponse,
  CompanyMember,
  CompanyMembershipDetailsResponse,
  CompanyResponse,
  CompanyStatusResponse,
  CreateCompanyPayload,
  InviteActionResponse,
  InviteCompanyMemberPayload,
  UpdateCompanyPayload,
  UpdateCompanyMemberPayload,
} from "../types/company";

const COMPANY_ENDPOINTS = {
  collection: "companies/",
  membershipDetails: "member/details/",
  detail: (id: string | number) => `companies/${id}/`,
  adminCollection: "admin/companies/",
  adminDetail: (id: string | number) => `admin/companies/${id}/`,
  adminToggleVerification: (id: string | number) => `admin/companies/${id}/toggle_verification/`,
  inviteMember: (companyId: string | number) => `company/${companyId}/invite/`,
  listMembers: (companyId: string | number) => `company/${companyId}/members/`,
  updateMember: (memberId: string | number) => `/company/member/${memberId}/`,
  removeMember: (memberId: string | number) => `company/member/${memberId}/delete/`,
  resendInvite: (memberId: string | number) => `company/member/${memberId}/resend-invite/`,
  listPendingInvites: (companyId: string | number) => `company/${companyId}/invites/`,
  cancelInvite: (memberId: string | number) => `company/invite/${memberId}/`,
} as const;

const hasBinaryValue = (payload: Record<string, unknown>) => {
  return Object.values(payload).some((value) => value instanceof File || value instanceof Blob);
};

const toFormData = (payload: Record<string, unknown>) => {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
};

const normalizePayload = (payload: CreateCompanyPayload | UpdateCompanyPayload | FormData) => {
  if (payload instanceof FormData) {
    return payload;
  }

  if (hasBinaryValue(payload as Record<string, unknown>)) {
    return toFormData(payload as Record<string, unknown>);
  }

  return payload;
};

export const createCompany = async (payload: CreateCompanyPayload | FormData) => {
  const normalized = normalizePayload(payload);
  const res = await API.post<CompanyResponse>(COMPANY_ENDPOINTS.collection, normalized);
  return res.data;
};

export const getCompanies = async () => {
  const res = await API.get<CompanyListResponse | CompanyDetailResponse[] | CompanyDetailResponse>(
    COMPANY_ENDPOINTS.collection,
  );
  return res.data;
};

export const getCompany = async (id: string | number) => {
  const res = await API.get<CompanyDetailResponse>(COMPANY_ENDPOINTS.detail(id));
  return res.data;
};

export const updateCompany = async (id: string | number, payload: UpdateCompanyPayload | FormData) => {
  const normalized = normalizePayload(payload);
  const res = await API.put<CompanyDetailResponse>(COMPANY_ENDPOINTS.detail(id), normalized);
  return res.data;
};

export const patchCompany = async (id: string | number, payload: UpdateCompanyPayload | FormData) => {
  const normalized = normalizePayload(payload);
  const res = await API.patch<CompanyDetailResponse>(COMPANY_ENDPOINTS.detail(id), normalized);
  return res.data;
};

export const deleteCompany = async (id: string | number) => {
  const res = await API.delete(COMPANY_ENDPOINTS.detail(id));
  return res.data;
};

const normalizeCompanyStatus = (
  data: CompanyListResponse | CompanyDetailResponse[] | CompanyDetailResponse,
): CompanyStatusResponse => {
  if (Array.isArray(data)) {
    const company = data[0] ?? null;
    return {
      has_company: data.length > 0,
      hasCompany: data.length > 0,
      is_verified: company?.is_verified,
      company,
    };
  }

  const results = (data as CompanyListResponse)?.results;
  if (Array.isArray(results)) {
    const company = results[0] ?? null;
    return {
      has_company: results.length > 0,
      hasCompany: results.length > 0,
      is_verified: company?.is_verified,
      company,
    };
  }

  const company = data as CompanyDetailResponse;
  return {
    has_company: Boolean(company?.id),
    hasCompany: Boolean(company?.id),
    is_verified: company?.is_verified,
    company,
  };
};

export const getCompanyStatus = async () => {
  const data = await getCompanies();
  return normalizeCompanyStatus(data);
};

export const getAdminCompanies = async (params?: { is_verified?: boolean }) => {
  const res = await API.get<CompanyListResponse | CompanyDetailResponse[]>(COMPANY_ENDPOINTS.adminCollection, {
    params,
  });
  return res.data;
};

export const getAdminCompany = async (id: string | number) => {
  const res = await API.get<CompanyDetailResponse>(COMPANY_ENDPOINTS.adminDetail(id));
  return res.data;
};

export const toggleAdminCompanyVerification = async (id: string | number) => {
  const res = await API.post<CompanyResponse>(COMPANY_ENDPOINTS.adminToggleVerification(id));
  return res.data;
};

export const verifyAdminCompany = async (id: string | number) => {
  const res = await API.patch<CompanyResponse>(COMPANY_ENDPOINTS.adminToggleVerification(id));
  return res.data;
};

export const unverifyAdminCompany = async (id: string | number) => {
  const res = await API.patch<CompanyResponse>(COMPANY_ENDPOINTS.adminToggleVerification(id));
  return res.data;
};

export const inviteCompanyMember = async (
  companyId: string | number,
  payload: InviteCompanyMemberPayload,
) => {
  const res = await API.post<InviteActionResponse>(COMPANY_ENDPOINTS.inviteMember(companyId), payload);
  return res.data;
};

export const getCompanyMembers = async (companyId: string | number) => {
  const res = await API.get<CompanyMember[] | { results?: CompanyMember[] }>(
    COMPANY_ENDPOINTS.listMembers(companyId),
  );

  if (Array.isArray(res.data)) {
    return res.data;
  }

  return Array.isArray(res.data?.results) ? res.data.results : [];
};

export const getCompanyMembershipDetails = async () => {
  const res = await API.get<CompanyMembershipDetailsResponse>(COMPANY_ENDPOINTS.membershipDetails);
  const memberships = res.data?.companies || [];

  return memberships.map((membership) => {
    return {
      id: `${membership.id ?? ""}`,
      role: membership.role || "recruiter",
      designation: membership.designation || undefined,
      is_active: membership.is_active,
      invite_status: membership.invite_status,
      is_owner: membership.is_owner,
      company: membership.company
        ? {
            id: membership.company.id,
            name: membership.company.name,
          }
        : undefined,
    } as CompanyMember;
  });
};

export const updateCompanyMemberRole = async (
  memberId: string | number,
  payload: UpdateCompanyMemberPayload,
) => {
  try {
    const res = await API.patch<CompanyMember>(COMPANY_ENDPOINTS.updateMember(memberId), payload);
    return res.data;
  } catch (patchError) {
    const status = (patchError as { response?: { status?: number } })?.response?.status;
    if (status && status !== 400 && status !== 405) {
      throw patchError;
    }

    const putRes = await API.put<CompanyMember>(COMPANY_ENDPOINTS.updateMember(memberId), payload);
    return putRes.data;
  }
};

export const removeCompanyMember = async (memberId: string | number) => {
  const res = await API.delete<InviteActionResponse>(COMPANY_ENDPOINTS.removeMember(memberId));
  return res.data;
};

export const resendCompanyInvite = async (memberId: string | number) => {
  const res = await API.post<InviteActionResponse>(COMPANY_ENDPOINTS.resendInvite(memberId));
  return res.data;
};

export const getCompanyPendingInvites = async (companyId: string | number) => {
  const res = await API.get<CompanyInvite[] | { results?: CompanyInvite[] }>(
    COMPANY_ENDPOINTS.listPendingInvites(companyId),
  );

  if (Array.isArray(res.data)) {
    return res.data;
  }

  return Array.isArray(res.data?.results) ? res.data.results : [];
};

export const cancelCompanyInvite = async (memberId: string | number) => {
  const res = await API.delete<InviteActionResponse>(COMPANY_ENDPOINTS.cancelInvite(memberId));
  return res.data;
};
