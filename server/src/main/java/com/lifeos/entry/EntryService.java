package com.lifeos.entry;

import com.lifeos.common.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneId;
import java.util.UUID;

@Service
public class EntryService {
    private final EntryRepository repository;
    private final CurrentUser currentUser;

    public EntryService(EntryRepository repository, CurrentUser currentUser) {
        this.repository = repository;
        this.currentUser = currentUser;
    }

    @Transactional
    public Entry create(EntryDtos.CreateEntryRequest request, ZoneId zoneId) {
        var type = request.type() == null ? EntryType.NOTE : request.type();
        var entry = new Entry(currentUser.id(), type, request.title(), request.rawText(), request.content(),
                request.occurredAt(), request.occurredAt().atZone(zoneId).toLocalDate(),
                EntrySource.MANUAL, request.aiAllowed() == null || request.aiAllowed());
        return repository.save(entry);
    }

    @Transactional(readOnly = true)
    public EntryDtos.PageResult<EntryDtos.EntryResponse> list(int page, int pageSize) {
        var pageable = PageRequest.of(Math.max(page - 1, 0), Math.min(Math.max(pageSize, 1), 100),
                Sort.by(Sort.Direction.DESC, "localDate").and(Sort.by(Sort.Direction.DESC, "occurredAt")));
        Page<Entry> result = repository.findByUserIdAndLocalDateBetween(
                currentUser.id(), java.time.LocalDate.of(1970, 1, 1), java.time.LocalDate.of(2999, 12, 31), pageable);
        return new EntryDtos.PageResult<>(result.map(EntryDtos.EntryResponse::from).getContent(),
                page, pageSize, result.getTotalElements());
    }
}
