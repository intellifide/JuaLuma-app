import { api } from './api';

export interface TicketRef {
    id: string;
    customer_uid: string;
    subject: string;
    Status: string; // Note: matches backend PascalCase
    created_at: string;
    updated_at: string;
}

export interface TicketDetail extends TicketRef {
    description: string;
    messages: {
        sender: string;
        message: string;
        created_at: string;
    }[];
}

export interface AgentReply {
    message: string;
    internal_note?: boolean;
}

export const supportService = {
    getTickets: async (status?: string) => {
        const params = status ? { status } : {};
        const response = await api.get<TicketRef[]>('/support-portal/tickets', { params });
        return response.data;
    },

    getTicket: async (ticketId: string) => {
        const response = await api.get<TicketDetail>(`/support-portal/tickets/${ticketId}`);
        return response.data;
    },

    replyToTicket: async (ticketId: string, reply: AgentReply) => {
        const response = await api.post(`/support-portal/tickets/${ticketId}/reply`, reply);
        return response.data;
    },

    updateStatus: async (ticketId: string, status: string) => {
        const response = await api.post(`/support-portal/tickets/${ticketId}/status`, { status });
        return response.data;
    }
};
