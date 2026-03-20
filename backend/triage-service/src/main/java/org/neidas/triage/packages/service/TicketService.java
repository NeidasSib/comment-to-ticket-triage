package org.neidas.triage.packages.service;

import lombok.RequiredArgsConstructor;

import org.neidas.triage.packages.dto.TicketResponse;
import org.neidas.triage.packages.repository.TicketRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class TicketService {


    private final TicketRepository ticketRepository;

    public Page<TicketResponse> getPageableTickets(Pageable pageable) {
        return ticketRepository.findAll(pageable)
                .map(ticket -> new TicketResponse(
                        ticket.getId(),
                        ticket.getTitle(),
                        ticket.getCategory(),
                        ticket.getPriority(),
                        ticket.getSummary(),
                        ticket.getCommentId(),
                        ticket.getCreatedAt()
                ));
    }

    public TicketResponse getTicketById(Long id) {
        return ticketRepository.findById(id)
                .map(ticket -> new TicketResponse(
                        ticket.getId(),
                        ticket.getTitle(),
                        ticket.getCategory(),
                        ticket.getPriority(),
                        ticket.getSummary(),
                        ticket.getCommentId(),
                        ticket.getCreatedAt()
                ))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id: " + id));
    }
}
