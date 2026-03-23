package org.neidas.triage.packages.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.neidas.triage.packages.dto.CommentRequest;
import org.neidas.triage.packages.dto.CommentResponse;
import org.neidas.triage.packages.service.CommentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentResponse> submitComment(@RequestBody @Valid CommentRequest request) {
            return ResponseEntity.ok(commentService.saveComment(request));
    }

    @GetMapping
    ResponseEntity<Page<CommentResponse>> getPageableComments(Pageable pageable) {
        return ResponseEntity.ok(commentService.getPageableComments(pageable));
    }
}
