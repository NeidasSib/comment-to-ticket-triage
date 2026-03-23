package org.neidas.triage.packages.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String text;
    private OffsetDateTime createdAt = OffsetDateTime.now(ZoneOffset.UTC);
    private TriageStatus triageStatus = TriageStatus.PENDING;
}
