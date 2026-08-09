import { api } from "../api/client";

export const contactService = {
  send(content: string): Promise<{ status: string }> {
    return api.post<{ status: string }>("/api/inquiries", { content });
  },
};
