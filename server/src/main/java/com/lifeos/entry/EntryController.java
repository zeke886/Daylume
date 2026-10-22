package com.lifeos.entry;

import com.lifeos.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;

@RestController
@RequestMapping("/entries")
public class EntryController {
    private final EntryService service;

    public EntryController(EntryService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<EntryDtos.PageResult<EntryDtos.EntryResponse>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize) {
        return ApiResponse.ok(service.list(page, pageSize));
    }

    @PostMapping
    public ApiResponse<EntryDtos.EntryResponse> create(
            @Valid @RequestBody EntryDtos.CreateEntryRequest request) {
        return ApiResponse.ok(EntryDtos.EntryResponse.from(service.create(request, ZoneId.of("Asia/Shanghai"))));
    }
}
