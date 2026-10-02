export interface UserData {
  user_id: number;
  user_fname: string;
  user_lname: string;
  user_rut: string;
  user_email: string;
  user_group_id: number;
  user_group_name: string;
  permissions: string[];
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_expires_in?: number;
}

export interface LoginResponse {
  status: string;
  data: UserData;
  tokens: AuthTokens;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  status?: string;
  access_token?: string;
  refresh_token?: string;
  access_expires_in?: number;
}
