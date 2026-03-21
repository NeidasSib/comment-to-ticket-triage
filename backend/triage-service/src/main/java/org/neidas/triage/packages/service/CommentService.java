package org.neidas.triage.packages.service;

import lombok.RequiredArgsConstructor;
import org.neidas.triage.packages.dto.CommentRequest;
import org.neidas.triage.packages.dto.CommentResponse;
import org.neidas.triage.packages.model.Comment;
import org.neidas.triage.packages.model.Ticket;
import org.neidas.triage.packages.repository.CommentRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CommentService {

    private final CommentRepository commentRepository;
    private final TriageService triageService;


    public CommentResponse saveComment(CommentRequest request) {
        Comment comment = new Comment();
        comment.setText(request.getText());

        Comment saved = commentRepository.save(comment);

        Ticket ticket = triageService.triage(saved.getId(), saved.getText());
        if (ticket != null) {
            saved.setIsTicketCreated(true);
            commentRepository.save(saved);
        }

        return new CommentResponse(
                saved.getId(),
                saved.getText(),
                saved.getCreatedAt(),
                saved.getIsTicketCreated()
        );
    }

    public Page<CommentResponse> getPageableComments(Pageable pageable) {
        return commentRepository.findAll(pageable)
                .map(c -> new CommentResponse(
                        c.getId(),
                        c.getText(),
                        c.getCreatedAt(),
                        c.getIsTicketCreated()
                ));
    }
}
