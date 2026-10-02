import api from "@/api/axiosClient";

export interface PaymentMethod {
  id: number;
  nombre: string;
}

export interface PaymentMethodListResponse {
  status: string;
  data: PaymentMethod[];
}

export interface PaymentMethodResponse {
  status: string;
  message?: string;
  data: PaymentMethod;
}

export interface PaymentMethodInput {
  nombre: string;
}

const endpoint = "/payments/methods";

export const paymentMethodsService = {
  async getMethods(): Promise<PaymentMethod[]> {
    const response = await api.get<PaymentMethodListResponse>(endpoint);
    return response.data.data;
  },

  async createMethod(input: PaymentMethodInput): Promise<unknown> {
    const response = await api.post<unknown>(endpoint, input);
    return response.data;
  },

  async updateMethod(id: number, input: PaymentMethodInput): Promise<unknown> {
    const response = await api.put<unknown>(`${endpoint}/${id}`, input);
    return response.data;
  },

  async deleteMethod(id: number): Promise<unknown> {
    const response = await api.delete<unknown>(`${endpoint}/${id}`);
    return response.data;
  },
};