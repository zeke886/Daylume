package com.lifeos.entry;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "entry")
public class Entry {
    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EntryType type;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "raw_text")
    private String rawText;

    private String content;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "local_date", nullable = false)
    private LocalDate localDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EntrySource source;

    @Column(name = "ai_allowed", nullable = false)
    private boolean aiAllowed;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Version
    private long version;

    protected Entry() {}

    public Entry(UUID userId, EntryType type, String title, String rawText, String content,
                 Instant occurredAt, LocalDate localDate, EntrySource source, boolean aiAllowed) {
        this.id = UUID.randomUUID();
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.rawText = rawText;
        this.content = content;
        this.occurredAt = occurredAt;
        this.localDate = localDate;
        this.source = source;
        this.aiAllowed = aiAllowed;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public EntryType getType() { return type; }
    public String getTitle() { return title; }
    public String getRawText() { return rawText; }
    public String getContent() { return content; }
    public Instant getOccurredAt() { return occurredAt; }
    public LocalDate getLocalDate() { return localDate; }
    public EntrySource getSource() { return source; }
    public boolean isAiAllowed() { return aiAllowed; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }
}
