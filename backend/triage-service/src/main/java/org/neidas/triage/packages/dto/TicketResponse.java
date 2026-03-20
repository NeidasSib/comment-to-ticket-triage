package org.neidas.triage.packages.dto;


import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private String title;
    private String category;
    private String priority;
    private String summary;

    private Long commentId;
    private LocalDateTime createdAt =  LocalDateTime.now();
}
