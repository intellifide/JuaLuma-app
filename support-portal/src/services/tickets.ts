import { api } from './api';

export interface AgentSummary {
    uid: string;
    display_name: string;
}

export interface TicketRef {
    id: string;
    customer_reference: string;
    subject: string;
    category: string;
    status: string;
    queue_status: string;
    assigned_agent?: AgentSummary | null;
    escalated_to_developer: boolean;
    escalated_at?: string | null;
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

export type TicketFilters = Partial<{
    status: string;
    queue_status: string;
    assignee: string;
}>;

export const supportService = {
    getTickets: async (filters?: TicketFilters) => {
        const response = await api.get<TicketRef[]>('/support-portal/tickets', { params: filters });
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
    },

    pickupTicket: async (ticketId: string) => {
        const response = await api.post(`/support-portal/tickets/${ticketId}/pickup`);
        return response.data;
    },

    assignTicket: async (ticketId: string, assigneeUid?: string) => {
        const response = await api.post(`/support-portal/tickets/${ticketId}/assign`, {
            assignee_uid: assigneeUid ?? null,
        });
        return response.data;
    },

    escalateTicket: async (ticketId: string, note?: string) => {
        const response = await api.post(`/support-portal/tickets/${ticketId}/escalate`, {
            note: note ?? null,
        });
        return response.data;
    },

    getAgents: async () => {
        const response = await api.get<AgentSummary[]>('/support-portal/agents');
        return response.data;
    },
};
