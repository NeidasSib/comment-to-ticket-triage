FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY backend/triage-service/gradlew backend/triage-service/gradlew.bat backend/triage-service/settings.gradle backend/triage-service/build.gradle ./
COPY backend/triage-service/gradle/wrapper gradle/wrapper
RUN chmod +x gradlew

COPY backend/triage-service/src src

RUN ./gradlew bootJar --no-daemon

FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

RUN addgroup -S spring && adduser -S spring -G spring

COPY --from=build /app/build/libs/*.jar app.jar

USER spring:spring
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
