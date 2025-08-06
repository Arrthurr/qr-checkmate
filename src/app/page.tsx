"use client";
import { query, orderBy, onSnapshot } from "firebase/firestore";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculateDistance } from "@/lib/utils";
import { schools } from "@/lib/schools";
import type { School, LogEntry, FormSchemaType } from "@/lib/types";
import { QrCode, CheckCircle, XCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import QrScannerDialog from "@/components/qr-scanner-dialog";
import ConfirmationDialog from "@/components/confirmation-dialog";
import ActivityLog from "@/components/activity-log";

// TODO: Replace with your project's Firebase configuration
const firebaseConfig = { 
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  schoolId: z.string({ required_error: "Please select a school." }),
  action: z.enum(["check-in", "check-out"], { required_error: "Please select an action." }),
});

export default function Home() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [isConfirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<{ success: boolean; message: string; details?: string }>({ success: false, message: "" });
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  const { toast } = useToast();

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
    },
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

 useEffect(() => {
    if (!hasMounted) return;

    const logsCollection = collection(db, "activityLogs");
    const q = query(logsCollection, orderBy("timestamp", "desc"));
    setIsLoadingLogs(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs: LogEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(), // Convert Firestore Timestamp to Date
        fullName: doc.data().fullName,
        schoolName: doc.data().schoolName,
        action: doc.data().action,
        status: doc.data().status,
        reason: doc.data().reason,
      }));
      setLog(fetchedLogs);
      setIsLoadingLogs(false);
    }, (error) => {
        console.error("Error fetching activity logs:", error);
        setIsLoadingLogs(false);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch activity logs.",
        });
    });
    return () => unsubscribe();
  }, [hasMounted]);

  const addLogEntry = async (entry: Omit<LogEntry, "id" | "timestamp">) => {
    try {
      await addDoc(collection(db, "activityLogs"), {
        ...entry,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Logging Error",
        description: "Failed to save activity log.",
      });
      console.error("Error adding document: ", e);
    }
  };

  const handleScanSuccess = async (scannedSchoolId: string) => {
    setScannerOpen(false);
    setIsProcessing(true);
    const formData = form.getValues();
    const selectedSchool = schools.find((s) => s.id === formData.schoolId);

    if (!selectedSchool || selectedSchool.id !== scannedSchoolId) {
      const reason = "QR Code Mismatch";
      setConfirmationStatus({
        success: false,
        message: reason,
        details: `The scanned QR code does not match the selected school.`,
      });
      addLogEntry({
        ...formData,
        schoolName: selectedSchool?.name || "Unknown School",
        status: "failure",
        reason,
      });
      setConfirmationOpen(true);
      setIsProcessing(false);
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;
      const distance = calculateDistance(
        latitude,
        longitude,
        selectedSchool.latitude,
        selectedSchool.longitude
      );

      if (distance <= 100) {
        setConfirmationStatus({
          success: true,
          message: `Successful ${formData.action}!`,
          details: `You have successfully completed your ${formData.action} at ${selectedSchool.name}.`,
        });
        addLogEntry({ ...formData, schoolName: selectedSchool.name, status: "success", reason: "Location verified" });
      } else {
        setConfirmationStatus({
          success: false,
          message: `${formData.action} Failed`,
          details: "You are not close enough to the school to complete this action.",
        });
        addLogEntry({ ...formData, schoolName: selectedSchool.name, status: "failure", reason: "Not within proximity" });
      }
    } catch (error) {
        let reason = "Could not retrieve location.";
        if (error instanceof GeolocationPositionError) {
            if (error.code === 1) reason = "Location access denied.";
            if (error.code === 2) reason = "Location position unavailable.";
            if (error.code === 3) reason = "Location request timed out.";
        }
      setConfirmationStatus({
          success: false,
          message: "Location Error",
          details: reason,
      });
      addLogEntry({ ...formData, schoolName: selectedSchool.name, status: "failure", reason });
    } finally {
      setConfirmationOpen(true);
      setIsProcessing(false);
    }
  };
  

  const onSubmit = async () => {
    try {
      // Check for camera permission by trying to get the media stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Stop the stream immediately after permission is granted to free up the camera
      stream.getTracks().forEach(track => track.stop());
      setScannerOpen(true);
    } catch (error) {
      console.error("Camera permission error:", error);
      toast({
        variant: "destructive",
        title: "Camera Permission Denied",
        description: "Please allow camera access to scan QR codes.",
      });
      const formData = form.getValues();
      const selectedSchool = schools.find((s) => s.id === formData.schoolId);
      addLogEntry({
          ...formData,
          schoolName: selectedSchool?.name || "Unknown School",
          status: "failure",
          reason: "Camera permission denied",
      });
    }
  };

  if (!hasMounted) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <>
      <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
        <div className="w-full max-w-5xl space-y-8">
          <header className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-3 text-primary">
              <QrCode className="h-10 w-10" />
              <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground">
                QR Checkmate
              </h1>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              A simple, performant, and secure app to check-in and check-out of schools using a QR code.
            </p>
          </header>

          <Card className="w-full max-w-md mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-center">Service Provider Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="schoolId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>School</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a school" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Action</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex items-center space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="check-in" />
                              </FormControl>
                              <FormLabel className="font-normal">Check-in</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="check-out" />
                              </FormControl>
                              <FormLabel className="font-normal">Check-out</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isProcessing}>
                    {isProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {isProcessing ? "Processing..." : "Scan QR & Submit"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <ActivityLog log={log} isLoading={isLoadingLogs} />
        </div>
      </main>

      {isScannerOpen && (
         <QrScannerDialog
            open={isScannerOpen}
            onOpenChange={setScannerOpen}
            onScanSuccess={handleScanSuccess}
            onScanError={(error) => {
              setScannerOpen(false);
              setIsProcessing(false);
              toast({ variant: 'destructive', title: 'QR Scan Error', description: error });
            }}
          />
      )}
     
      <ConfirmationDialog
        open={isConfirmationOpen}
        onOpenChange={setConfirmationOpen}
        status={confirmationStatus.success}
        title={confirmationStatus.message}
        description={confirmationStatus.details}
        icon={confirmationStatus.success ? <CheckCircle className="h-16 w-16 text-primary" /> : <XCircle className="h-16 w-16 text-red-500" />}
      />
    </>
  );
}
