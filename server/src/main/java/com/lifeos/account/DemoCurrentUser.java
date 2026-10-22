package com.lifeos.account;

import com.lifeos.common.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class DemoCurrentUser implements CurrentUser {
    private final UUID userId;

    public DemoCurrentUser(@Value("${lifeos.demo-user-id}") UUID userId) {
        this.userId = userId;
    }

    @Override
    public UUID id() {
        return userId;
    }
}
