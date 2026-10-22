package com.lifeos.entry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class EntryDtos {
    private EntryDtos() {}

    public record CreateEntryRequest(
            @NotBlank @Size(max = 200) String title,
            @Size(max = 5000) String rawText,
            @Size(max = 5000) String content,
            @NotNull Instant occurredAt,
            EntryType type,
            Boolean aiAllowed
    ) {}

    public record EntryResponse(
            UUID id, EntryType type, String title, String rawText, String content,
            Instant occurredAt, LocalDate localDate, EntrySource source,
            boolean aiAllowed, Instant createdAt, Instant updatedAt, long version
    ) {
        public static EntryResponse from(Entry entry) {
            return new EntryResponse(entry.getId(), entry.getType(), entry.getTitle(),
                    entry.getRawText(), entry.getContent(), entry.getOccurredAt(),
                    entry.getLocalDate(), entry.getSource(), entry.isAiAllowed(),
                    entry.getCreatedAt(), entry.getUpdatedAt(), entry.getVersion());
        }
    }

    public record PageResult<T>(List<T> items, int page, int pageSize, long total) {}
}
