package org.neidas.triage.packages.dto;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CommentRequest {

    @NotBlank(message = "Comment can't be empty")
    @Size(min = 1, max = 500, message = "Comment must be between 1 and 500 characters")
    private String text;
}
