package org.neidas.triage.packages.model;

public enum Category {
    BUG,
    FEATURE,
    BILLING,
    ACCOUNT,
    OTHER;

    public static Category fromString(String value){
        if(value == null) return OTHER;
        try{
            return valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e){
            return OTHER;
        }
    }
}
