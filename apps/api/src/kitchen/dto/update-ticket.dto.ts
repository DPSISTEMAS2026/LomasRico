import { TicketStatus } from '@lomasrico/database';

export class UpdateTicketStatusDto {
    status: TicketStatus;
    /** Solo para anular: PIN de cajero/administrador/dueño y motivo. */
    approvalPin?: string;
    reason?: string;
}
