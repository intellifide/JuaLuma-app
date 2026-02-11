/*
 * Copyright (c) 2026 Intellifide, LLC.
 * Licensed under PolyForm Noncommercial License 1.0.0.
 * See "PolyForm-Noncommercial-1.0.0.txt" for full text.
 *
 * COMMUNITY RIGHTS:
 * - You CAN modify this code for personal use.
 * - You CAN build and share widgets/plugins for the ecosystem.
 *
 * RESTRICTIONS:
 * - You CANNOT resell, repackage, or distribute this application for a fee.
 * - You CANNOT use this application for commercial enterprise purposes.
 */

import { api } from './api';

export interface TicketMessage {
    id: string;
    ticket_id: string;
    sender_type: 'user' | 'support';
    sender_id: string;
    message: string;
    created_at: string;
}

export interface Ticket {
    id: string;
    user_id: string;
    subject: string;
    description: string;
    category: string;
    status: 'open' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
    messages: TicketMessage[];
}

export interface TicketCreate {
    subject: string;
    description: string;
    category: string;
}

export interface TicketMessageCreate {
    message: string;
}

export interface TicketRatingCreate {
    rating: number;
    feedback_text?: string;
}

export const supportService = {
    createTicket: async (data: TicketCreate): Promise<Ticket> => {
        const response = await api.post<Ticket>('/support/tickets', data);
        return response.data;
    },

    getTickets: async (): Promise<Ticket[]> => {
        const response = await api.get<Ticket[]>('/support/tickets');
        return response.data;
    },

    getTicketDetail: async (ticketId: string): Promise<Ticket> => {
        const response = await api.get<Ticket>(`/support/tickets/${ticketId}`);
        return response.data;
    },

    addMessage: async (ticketId: string, data: TicketMessageCreate): Promise<TicketMessage> => {
        const response = await api.post<TicketMessage>(`/support/tickets/${ticketId}/messages`, data);
        return response.data;
    },

    closeTicket: async (ticketId: string): Promise<Ticket> => {
        const response = await api.post<Ticket>(`/support/tickets/${ticketId}/close`, {});
        return response.data;
    },

    rateTicket: async (ticketId: string, data: TicketRatingCreate): Promise<void> => {
        await api.post(`/support/tickets/${ticketId}/rate`, data);
    },

    getHealth: async (): Promise<Record<string, unknown>> => {
        const response = await api.get('/health');
        return response.data;
    },
};
