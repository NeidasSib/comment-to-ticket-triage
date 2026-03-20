package org.neidas.triage.packages.controller;

import lombok.RequiredArgsConstructor;
import org.neidas.triage.packages.dto.TicketResponse;
import org.neidas.triage.packages.service.TicketService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    ResponseEntity<Page<TicketResponse>> getPageableTickets(Pageable pageable) {
        return ResponseEntity.ok(ticketService.getPageableTickets(pageable));
    }

    @GetMapping("/{id}")
    ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }
}
