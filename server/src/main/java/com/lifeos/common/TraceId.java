package com.lifeos.common;

import java.util.UUID;

public final class TraceId {
    private TraceId() {}

    public static String current() {
        return UUID.randomUUID().toString();
    }
}
