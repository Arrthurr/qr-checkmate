import { render, screen, fireEvent } from "@testing-library/react";
import QRScannerDialog from "./qr-scanner-dialog";

jest.mock("html5-qrcode", () => ({
  Html5QrcodeScanner: class {
    render = jest.fn();
    clear = jest.fn();
  },
}));

describe("QRScannerDialog", () => {
  it("renders the dialog when open is true", () => {
    render(
      <QRScannerDialog
        open={true}
        onOpenChange={() => {}}
        onScan={() => {}}
        onError={() => {}}
      />
    );
    expect(screen.getByText("Scan QR Code")).toBeInTheDocument();
  });

  it("does not render the dialog when open is false", () => {
    render(
      <QRScannerDialog
        open={false}
        onOpenChange={() => {}}
        onScan={() => {}}
        onError={() => {}}
      />
    );
    expect(screen.queryByText("Scan QR Code")).not.toBeInTheDocument();
  });

  it("calls onOpenChange with false when the cancel button is clicked", () => {
    const onOpenChange = jest.fn();
    render(
      <QRScannerDialog
        open={true}
        onOpenChange={onOpenChange}
        onScan={() => {}}
        onError={() => {}}
      />
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
