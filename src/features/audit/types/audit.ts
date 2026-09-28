export type AuditDetails = Record<string, unknown>;

export type AuditRecord = {
  id: number;
  created_at: string;
  user_name: string;
  module: string;
  action_type: string;
  record_id: string | number | null;
  ip_address: string | null;
  details: AuditDetails;
};

export type AuditMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AuditQuery = {
  page: number;
  limit: number;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  sortOrder?: "ASC" | "DESC";
};

export type AuditPage = {
  data: AuditRecord[];
  meta: AuditMeta;
};
