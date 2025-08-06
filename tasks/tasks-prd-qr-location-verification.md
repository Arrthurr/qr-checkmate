## Relevant Files

- `src/app/page.tsx` - Main application page component where the QR scanning and verification logic will reside and interact with other components.
- `src/components/qr-scanner-dialog.tsx` - Existing component for handling the QR code scanning interface. Needs integration and potentially modifications for handling scanned data.
- `src/components/confirmation-dialog.tsx` - Existing component for displaying the result of the check-in/check-out attempt. Needs to accept status and reason.
- `src/components/activity-log.tsx` - Component for displaying the list of activity logs. Needs to be updated to fetch and display data from Firestore.
- `src/lib/schools.ts` - Contains the list of schools with their locations, needed for distance calculation.
- `src/lib/types.ts` - Contains shared TypeScript types, likely needs a type definition for `LogEntry` if not already present.
- `src/lib/utils.ts` - Utility functions, a good place to add a distance calculation helper.
- `src/lib/utils.test.ts` - Unit tests for utility functions, including distance calculation.
- `.env` - Environment file for storing Firebase configuration keys.
- `src/ai/dev.ts` or similar (if using AI for any part, though not explicitly in PRD) - May need updates if AI is involved in processing.
- `firestore.rules` (if implementing security rules, though not explicitly in PRD) - Consider basic security rules for Firestore.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Ensure proper handling of asynchronous operations, especially with camera access, geolocation, and database interactions.
- Displaying loading states to the user during asynchronous operations is important for good UX.

## Tasks

- [ ] 1.0 Implement QR Scanning and Initial Validation
  - [ ] 1.1 Modify `src/app/page.tsx` to add a button to trigger the QR scanning process.
  - [ ] 1.2 Implement logic to request camera permissions upon button click.
  - [ ] 1.3 If camera permission is denied, display an error message using a toast or similar.
  - [ ] 1.4 If camera permission is granted, open the `QrScannerDialog`.
  - [ ] 1.5 Implement the QR code scanning logic within `QrScannerDialog` to detect and read QR data.
  - [ ] 1.6 Extract the school identifier from the scanned QR code data.
  - [ ] 1.7 Compare the scanned school identifier with the school selected in the form.
  - [ ] 1.8 If school identifiers do not match, mark the attempt as "invalid" with reason "QR Code Mismatch" and proceed to logging/confirmation (Task 3.0).
  - [ ] 1.9 Close the `QrScannerDialog` after a successful scan or mismatch.
- [ ] 2.0 Implement Geolocation and Distance Calculation
  - [ ] 2.1 If school identifiers match (from Task 1.8), request geolocation permissions.
  - [ ] 2.2 If geolocation permission is denied, mark the attempt as "invalid" with reason "Location access denied" and proceed to logging/confirmation (Task 3.0).
  - [ ] 2.3 If geolocation permission is granted, retrieve the user's current latitude and longitude.
  - [ ] 2.4 Retrieve the selected school's known location (latitude and longitude) from `src/lib/schools.ts` using the matched school identifier.
  - [ ] 2.5 Implement a utility function (e.g., in `src/lib/utils.ts`) to calculate the distance between two sets of lat/lon coordinates using the Haversine formula.
  - [ ] 2.6 Add unit tests for the distance calculation utility function in `src/lib/utils.test.ts`.
  - [ ] 2.7 Calculate the distance between the user's location and the school's location using the utility function.
  - [ ] 2.8 If the calculated distance is within 100 meters, mark the attempt as "valid".
  - [ ] 2.9 If the calculated distance is greater than 100 meters, mark the attempt as "invalid" with reason "Not within proximity".
- [ ] 3.0 Integrate Firestore for Activity Logging
  - [ ] 3.1 Ensure Firebase is initialized in the application (already done in `src/app/page.tsx` based on conversation summary).
  - [ ] 3.2 Ensure the `activityLogs` collection exists in Firestore (manual step or via setup script).
  - [ ] 3.3 Create or verify the TypeScript type definition for `LogEntry` in `src/lib/types.ts` to match the Firestore document structure.
  - [ ] 3.4 Modify the logic in `src/app/page.tsx` to construct a `LogEntry` object with all required fields (`timestamp`, `fullName`, `schoolName`, `action`, `status`, `reason`).
  - [ ] 3.5 Use the Firebase SDK (`addDoc`, `collection`, `serverTimestamp`) to write the `LogEntry` object to the `activityLogs` collection in Firestore for every attempt (valid or invalid).
  - [ ] 3.6 Implement basic error handling for Firestore write operations.
- [ ] 4.0 Update Activity Log Display
  - [ ] 4.1 Implement functionality in `src/app/page.tsx` (or a data fetching hook/component) to fetch recent activity log entries from the `activityLogs` Firestore collection.
  - [ ] 4.2 Modify the `ActivityLog` component (`src/components/activity-log.tsx`) to accept and display the list of `LogEntry` objects fetched from Firestore instead of relying on local state.
  - [ ] 4.3 Consider adding a loading state to the `ActivityLog` component while data is being fetched.
- [ ] 5.0 Implement Error Handling and User Feedback
  - [ ] 5.1 Ensure error messages for camera and geolocation permission denials are clearly displayed to the user.
  - [ ] 5.2 Display the `ConfirmationDialog` after each check-in/check-out attempt, showing the final status (valid/invalid) and the reason (if invalid).
  - [ ] 5.3 Pass the determined status and reason to the `ConfirmationDialog` component.
  - [ ] 5.4 Add visual indicators (e.g., loading spinner) while the app is processing the scan, requesting location, calculating distance, or writing to the database.
  - [ ] 5.5 Refine existing form submission logic in `src/app/page.tsx` to orchestrate the steps of scanning, location check, validation, logging, and confirmation display.