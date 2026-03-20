package org.neidas.triage.packages.dto;


import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CommentRequest {

    @NotBlank(message = "Comment can't be empty")
    private String text;
}
