package org.neidas.triage.packages.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import org.neidas.triage.packages.model.Category;
import org.neidas.triage.packages.model.Priority;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String title;
    private Category category;
    private Priority priority;
    private String summary;

    private Long commentId;
    private LocalDateTime createdAt =  LocalDateTime.now();
}
