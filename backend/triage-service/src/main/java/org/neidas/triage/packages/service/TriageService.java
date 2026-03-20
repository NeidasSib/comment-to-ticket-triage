package org.neidas.triage.packages.service;

import lombok.RequiredArgsConstructor;
import org.neidas.triage.packages.client.HuggingFaceClient;
import org.neidas.triage.packages.model.Ticket;
import org.neidas.triage.packages.repository.TicketRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class TriageService {
    private final HuggingFaceClient huggingFaceClient;
    private final TicketRepository ticketRepository;

    public Ticket triage(Long commentId, String commentText){
        String triagePrompt = """
                You are a support ticket triage assistant.
                Analyze the following user comment and determine if it requires a support ticket.
                
                A ticket IS needed for:
                - App bugs or crashes
                - Error messages
                - Feature requests (any suggestion for new functionality)
                - Billing problems
                - Account issues
                - Any actionable feedback
                
                A ticket is NOT needed for:
                - Pure compliments with no actionable request
                - General praise with no suggestion
                - Thank you messages
                
                Important: If the comment contains BOTH a compliment AND a request, it still needs a ticket.
                
                You must reply with ONLY one word, either TICKET or NO_TICKET, nothing else.
                
                Comment: "%s"
                """.formatted(commentText);
        String triageResult = huggingFaceClient.query(triagePrompt);

        System.out.println("Triage result: " + triageResult);

        if(triageResult == null || !triageResult.toUpperCase().contains("TICKET") || triageResult.toUpperCase().contains("NO_TICKET")){
            return null;
        };

        String detailPrompt = """
                A user submitted this comment: "%s"
                Generate a support ticket in exactly this format, nothing else:
                TITLE: <short title>
                CATEGORY: <one of: bug, feature, billing, account, other>
                PRIORITY: <one of: low, medium, high>
                SUMMARY: <one sentence summary>
                """.formatted(commentText);

        String detailResult = huggingFaceClient.query(detailPrompt);

        if (detailResult == null) return null;

        return parseAndSaveTicket(commentId, detailResult);
    }

    private Ticket parseAndSaveTicket(Long commentId, String detailResult) {
        Ticket ticket = new Ticket();
        ticket.setCommentId(commentId);

        for(String line : detailResult.split("\n")){
            if(line.startsWith("TITLE:")){
                ticket.setTitle(line.replace("TITLE:", "").trim());
            }
            else if(line.startsWith("CATEGORY:")){
                ticket.setCategory(line.replace("CATEGORY:", "").trim());
            }
            else if(line.startsWith("PRIORITY:")){
                ticket.setPriority(line.replace("PRIORITY:", "").trim());
            }
            else if(line.startsWith("SUMMARY:")){
                ticket.setSummary(line.replace("SUMMARY:", "").trim());
            }
        }

        if (ticket.getTitle() == null) ticket.setTitle("Untitled");
        if (ticket.getCategory() == null) ticket.setCategory("other");
        if (ticket.getPriority() == null) ticket.setPriority("medium");
        if (ticket.getSummary() == null) ticket.setSummary(detailResult.trim());

        return ticketRepository.save(ticket);
    }
}
