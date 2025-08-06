# Product Requirements Document: QR Location Verification

## 1. Introduction

This document outlines the requirements for a new feature that allows users to verify their presence at a pre-assigned school location by scanning a QR code and comparing their current device location to the school's known location. This feature aims to ensure accurate and secure check-ins and check-outs for service providers.

## 2. Goals

*   Enable users to confirm they are at the correct school location using a QR code and device geolocation.
*   Log all check-in and check-out attempts, including the outcome (valid/invalid) and reason.
*   Provide a clear and simple user interface for the scanning and verification process.
*   Store check-in/check-out activity in a way that allows for later review.

## 3. User Stories

*   As a service provider, I want to scan a QR code at a school so that the app can verify I am at the correct location for my check-in/check-out.
*   As a service provider, I want the app to compare my device's location with the school's location from the QR code so that I know if my check-in is valid.
*   As a service provider, I want to see a clear confirmation if my check-in/check-out was successful or not.
*   As an administrator, I want check-in and check-out attempts to be logged so that I can review the activity later.

## 4. Functional Requirements

1.  The application **must** display a button labeled "Scan QR Code & Submit".
2.  Upon tapping "Scan QR Code & Submit", the application **must** request access to the user's device camera.
3.  If camera access is granted, the application **must** open a camera view with a QR code scanner.
4.  The QR code scanner **must** detect and read the data from a QR code.
5.  The data read from the QR code **must** contain the unique identifier for the school.
6.  Upon successful scanning of a QR code, the application **must** request access to the user's device geolocation.
7.  If geolocation access is granted, the application **must** retrieve the user's current latitude and longitude.
8.  The application **must** compare the school identifier from the scanned QR code with the school selected by the user in the form.
9.  If the school identifier from the QR code does **not** match the selected school, the attempt **must** be marked as an "invalid check-in" with the reason "QR Code Mismatch".
10. If the school identifier from the QR code matches the selected school, the application **must** calculate the distance between the user's retrieved location and the school's known location (obtained from `schools.ts` using the matched school identifier).
11. If the distance between the user's location and the school's location is within 100 meters, the attempt **must** be marked as a "valid check-in".
12. If the distance is greater than 100 meters, the attempt **must** be marked as an "invalid check-in" with the reason "Not within proximity".
13. For every attempt (valid or invalid), the application **must** log the following information:
    *   Timestamp of the attempt.
    *   User's full name (from the form).
    *   School name (based on the selected school).
    *   Action (check-in or check-out, from the form).
    *   Status (success for valid, failure for invalid).
    *   Reason (if invalid, e.g., "QR Code Mismatch", "Not within proximity", "Location access denied", "Camera access denied").
14. If camera permission is denied, the application **must** display an error message and prevent the scanning process.
15. If geolocation permission is denied, the application **must** display an error message and mark the attempt as "invalid check-in" with the reason "Location access denied".
16. The application **must** display a confirmation dialog showing the status (valid/invalid) and a brief message after each attempt.
17. The activity log **must** display a list of recent check-in/check-out attempts with the logged information.

## 5. Non-Goals (Out of Scope)

*   Storing the exact latitude and longitude of the user's check-in location in the log.
*   Real-time tracking of user location.
*   Allowing users to manually enter school IDs or locations.
*   Support for QR codes that do not contain a school identifier.
*   User authentication or profiles beyond the full name entered in the form.
*   Reporting or filtering capabilities for the activity log beyond simply displaying the list.

## 6. Design Considerations

*   Utilize the existing `QrScannerDialog` component for the QR scanning interface.
*   Utilize the existing `ConfirmationDialog` component for displaying the attempt outcome.
*   Utilize the existing `ActivityLog` component to display logged attempts.
*   Ensure the UI provides clear feedback to the user during the scanning and verification process (e.g., loading states).

## 7. Technical Considerations

*   The distance calculation should use the Haversine formula or a similar method appropriate for calculating distances on a sphere (the Earth).
*   The activity log data, currently stored in memory (`page.tsx`), needs to be persisted in a remote database.
*   **Firestore Implementation:** Guidance is needed on how to structure the data in Firestore to store the `LogEntry` objects. Consider a collection named `activityLogs` where each document represents a single log entry. The document fields should correspond to the properties of the `LogEntry` type (`timestamp`, `fullName`, `schoolName`, `action`, `status`, `reason`). How to handle potential increases in log entries over time should be considered (e.g., using queries with limits or pagination if needed for displaying the log, although initial scope is just displaying recent).
*   Handling potential errors during camera access, location access, QR scanning, distance calculation, and database writes is crucial.
*   Ensure necessary permissions for camera and geolocation are requested and handled gracefully on different devices and browsers.

## 8. Success Metrics

*   Percentage of check-in/check-out attempts successfully logged.
*   User feedback on the ease of use of the QR scanning process.
*   Successful storage and retrieval of log data from the database.

## 9. Open Questions

*   Are there any specific requirements for the format or content of the school identifier within the QR code? (Assuming it will be a simple string matching the `id` in `schools.ts`).
*   What level of precision is required for the distance calculation? (Assuming standard `Math` functions will be sufficient).
*   Are there any security considerations for storing user names and activity logs that need to be addressed?
*   How should the application handle cases where geolocation services are disabled on the user's device?