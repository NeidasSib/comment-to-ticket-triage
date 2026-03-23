package org.neidas.triage.packages.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.neidas.triage.packages.model.TriageStatus;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;

@Data
@AllArgsConstructor
public class CommentResponse {

    private Long id;
    private String text;
    private OffsetDateTime createdAt;
    private TriageStatus triageStatus;
}
