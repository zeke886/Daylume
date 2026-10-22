package com.lifeos.entry;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.UUID;

public interface EntryRepository extends JpaRepository<Entry, UUID> {
    Page<Entry> findByUserIdAndLocalDateBetween(UUID userId, LocalDate from, LocalDate to, Pageable pageable);
}
