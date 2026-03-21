package org.neidas.triage.packages.model;

public enum Priority {
    LOW,
    MEDIUM,
    HIGH;

    public static Priority fromString(String value){
        if(value == null) return MEDIUM;
        try{
            return Priority.valueOf(value.toUpperCase());
        }catch (Exception e){
            return MEDIUM;
        }
    }
}
