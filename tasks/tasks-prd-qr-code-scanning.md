## Relevant Files

- `package.json` - To add the new QR code scanner library dependency.
- `src/components/qr-scanner-dialog.tsx` - A new component that will contain the QR code scanner and modal logic.
- `src/components/qr-scanner-dialog.test.tsx` - Unit tests for the `qr-scanner-dialog.tsx` component.
- `src/app/page.tsx` - The main application page where the scanner will be triggered from.
- `src/app/page.test.tsx` - Tests for the main page, to be updated to include the new QR scanning workflow.
- `src/hooks/use-mobile.tsx` - Existing hook to determine if the feature should be active.
- `src/components/ui/alert-dialog.tsx` - Existing component to be used for displaying permission errors.

### Notes

- Unit tests should be created for new components and updated for modified components.
- Use `npm install --save <library-name>` to add the new dependency.
- Use `npx jest [optional/path/to/test/file]` to run tests.

## Tasks

- [ ] 1.0 **Setup QR Code Scanning Library**
  - [ ] 1.1 Research and select a suitable QR code scanning library for React (e.g., `react-qr-scanner`, `html5-qrcode`).
  - [ ] 1.2 Install the chosen library as a project dependency using `npm install`.

- [ ] 2.0 **Create QR Scanner Dialog Component**
  - [ ] 2.1 Create a new file `src/components/qr-scanner-dialog.tsx`.
  - [ ] 2.2 Implement a dialog component using the existing `Dialog` from `src/components/ui/dialog.tsx`.
  - [ ] 2.3 Integrate the QR scanner component from the selected library within the dialog.
  - [ ] 2.4 Add props to the dialog for controlling its open/closed state (e.g., `open`, `onOpenChange`).
  - [ ] 2.5 Add callback props for handling successful scans (`onScan`) and errors (`onError`).
  - [ ] 2.6 Add a "Cancel" button to allow the user to close the dialog without scanning.

- [ ] 3.0 **Integrate Scanner into the Main Page**
  - [ ] 3.1 In `src/app/page.tsx`, import the new `QRScannerDialog` component.
  - [ ] 3.2 Add state to manage the visibility of the scanner dialog (e.g., `const [isScannerOpen, setScannerOpen] = useState(false);`).
  - [ ] 3.3 Use the `useMobile` hook to detect if the user is on a mobile device.
  - [ ] 3.4 Modify the "Submit" button's `onClick` handler to set `isScannerOpen` to `true` only on mobile devices.
  - [ ] 3.5 Render the `QRScannerDialog` component, passing the required state and callbacks.

- [ ] 4.0 **Implement Post-Scan Data Submission**
  - [ ] 4.1 In `src/app/page.tsx`, create the `handleScan` function to be passed to the `QRScannerDialog`'s `onScan` prop.
  - [ ] 4.2 Inside `handleScan`, receive the scanned data and the current form data.
  - [ ] 4.3 Modify the existing Firestore `addDoc` call to include the QR code data alongside the form data in the payload.
  - [ ] 4.4 After a successful submission, ensure the scanner dialog is closed.

- [ ] 5.0 **Handle Camera Permission Errors**
  - [ ] 5.1 In `src/app/page.tsx`, add state to manage the permission error state (e.g., `const [permissionError, setPermissionError] = useState(false);`).
  - [ ] 5.2 Create an `handleError` function to pass to the `QRScannerDialog`'s `onError` prop. This function should set `permissionError` to `true`.
  - [ ] 5.3 Use the existing `AlertDialog` component to display a user-friendly error message when `permissionError` is true.
  - [ ] 5.4 Ensure the `AlertDialog` provides an option for the user to dismiss the message.
