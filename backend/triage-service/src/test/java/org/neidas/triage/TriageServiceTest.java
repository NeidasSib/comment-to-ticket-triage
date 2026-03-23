package org.neidas.triage;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.neidas.triage.packages.client.HuggingFaceClient;
import org.neidas.triage.packages.model.Category;
import org.neidas.triage.packages.model.Comment;
import org.neidas.triage.packages.model.Priority;
import org.neidas.triage.packages.model.TriageStatus;
import org.neidas.triage.packages.repository.CommentRepository;
import org.neidas.triage.packages.repository.TicketRepository;
import org.neidas.triage.packages.service.TriageService;

import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TriageServiceTest {

    @Mock
    HuggingFaceClient huggingFaceClient;
    @Mock
    TicketRepository ticketRepository;
    @Mock
    CommentRepository commentRepository;

    @InjectMocks
    TriageService triageService;

    @Test
    void triage_whenModelReturnsNOTICKET_setsNoTicketStatus() {
        when(huggingFaceClient.query(any())).thenReturn("NO_TICKET");
        Comment comment = new Comment();
        when(commentRepository.findById(1L)).thenReturn(Optional.of(comment));

        triageService.triage(1L, "Great app, love it!");

        verify(commentRepository).save(argThat(c -> c.getTriageStatus() == TriageStatus.NO_TICKET));
    }

    @Test
    void triage_whenModelReturnsTICKET_setsPendingThenCreated() {
        when(huggingFaceClient.query(any())).thenReturn("TICKET").thenReturn("TITLE: Login crash\nCATEGORY: bug\nPRIORITY: high\nSUMMARY: App crashes.");
        Comment comment = new Comment();
        comment.setTriageStatus(TriageStatus.PENDING);
        when(commentRepository.findById(1L)).thenReturn(Optional.of(comment));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        triageService.triage(1L, "The app crashes after login.");
        verify(commentRepository).save(argThat(c -> c.getTriageStatus() == TriageStatus.TICKET_CREATED));
    }

    @Test
    void triage_whenFirstCallReturnsNull_setsFailed() {
        when(huggingFaceClient.query(any())).thenReturn(null);
        Comment comment = new Comment();
        comment.setTriageStatus(TriageStatus.PENDING);
        when(commentRepository.findById(1L)).thenReturn(Optional.of(comment));
        triageService.triage(1L, "some text");
        verify(commentRepository).save(argThat(c -> c.getTriageStatus() == TriageStatus.FAILED));
    }

    @ParameterizedTest
    @ValueSource(strings = {"TICKET", "I think TICKET is needed", "ticket", "Yes, TICKET."})
    void triage_variousTicketResponses_createTicket(String modelResponse) {
        when(huggingFaceClient.query(any())).thenReturn(modelResponse).thenReturn("TITLE: T\nCATEGORY: bug\nPRIORITY: low\nSUMMARY: S.");
        when(commentRepository.findById(any())).thenReturn(Optional.of(new Comment()));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        triageService.triage(1L, "text");
        verify(ticketRepository).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"NO_TICKET", "I think NO_TICKET", "no_ticket", ""})
    void triage_variousNoTicketResponses_noTicketCreated(String modelResponse) {
        when(huggingFaceClient.query(any())).thenReturn(modelResponse);
        when(commentRepository.findById(any())).thenReturn(Optional.of(new Comment()));
        triageService.triage(1L, "text");
        verify(ticketRepository, never()).save(any());
    }

    @Test
    void triage_parsesAllFieldsFromDetailResult() {
        when(huggingFaceClient.query(any())).thenReturn("TICKET").thenReturn("TITLE: Login crash\nCATEGORY: BUG\nPRIORITY: HIGH\nSUMMARY: Crashes on login.");
        when(commentRepository.findById(any())).thenReturn(Optional.of(new Comment()));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        triageService.triage(1L, "App crashes after I log in.");
        verify(ticketRepository).save(argThat(ticket -> "Login crash".equals(ticket.getTitle()) && ticket.getCategory() == Category.BUG && ticket.getPriority() == Priority.HIGH && "Crashes on login.".equals(ticket.getSummary()) && ticket.getCommentId().equals(1L)));
    }

    @Test
    void triage_whenDetailResultMissingFields_usesDefaults() {
        when(huggingFaceClient.query(any())).thenReturn("TICKET").thenReturn("some garbled output with no prefix");
        when(commentRepository.findById(any())).thenReturn(Optional.of(new Comment()));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        triageService.triage(1L, "text");
        verify(ticketRepository).save(argThat(ticket -> "Untitled".equals(ticket.getTitle()) && ticket.getCategory() == Category.OTHER && ticket.getPriority() == Priority.MEDIUM));
    }

    @Test
    void triage_whenSecondCallReturnsNull_setsFailed() {
        when(huggingFaceClient.query(any())).thenReturn("TICKET").thenReturn(null);
        when(commentRepository.findById(1L)).thenReturn(Optional.of(new Comment()));
        triageService.triage(1L, "some text");
        verify(commentRepository).save(argThat(c -> c.getTriageStatus() == TriageStatus.FAILED));
        verify(ticketRepository, never()).save(any());
    }


}
