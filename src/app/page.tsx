"use client";

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyLocation } from "@/ai/flows/verify-location";
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

  // Initialize Firebase only if it hasn't been initialized yet
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const db = getFirestore(app); 

  const addLogEntry = async (entry: Omit<LogEntry, "id" | "timestamp">) => {
    try {
      // Add a new document with a generated id.
      const docRef = await addDoc(collection(db, "activityLogs"), {
        ...entry,
        timestamp: serverTimestamp(), // Use server timestamp 
      });
      console.log("Document written with ID: ", docRef.id);
      // We no longer update local state here.
      // The ActivityLog component will need to fetch data from Firestore.
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };
  const handleScanSuccess = async (scannedSchoolId: string) => {
    // The scannedSchoolId is already the extracted school identifier based on the PRD assumption.
    setScannerOpen(false);
    setIsProcessing(true);
    const formData = form.getValues();
    const selectedSchool = schools.find(s => s.id === formData.schoolId);

    if (!selectedSchool || selectedSchool.id !== scannedData) {
      toast({
        variant: "destructive",
        title: "QR Code Mismatch",
        description: "The scanned QR code does not match the selected school.",
      });
 addLogEntry({
 ...formData,
        schoolName: selectedSchool?.name || scannedSchoolId, // Use scanned ID if school not found
        status: "failure",
        reason: "QR Code Mismatch",
      });
      setIsProcessing(false);
      setConfirmationStatus({
 success: false,
        message: "QR Code Mismatch",
 details: "The scanned QR code does not match the selected school.",
      });
      return;
    }
 
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      const result = await verifyLocation({
        userLatitude: latitude,
        userLongitude: longitude,
        schoolLatitude: selectedSchool.latitude,
        schoolLongitude: selectedSchool.longitude,
      });

      if (result.isWithinProximity) {
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
      setConfirmationOpen(true);
      form.reset();
 
    } catch (error) {
      const reason = error instanceof GeolocationPositionError && error.code === 1
        ? "Location access denied."
        : "Could not retrieve location.";
      
      toast({
        variant: "destructive",
        title: "Location Error",
        description: reason,
      });
      addLogEntry({ ...formData, schoolName: selectedSchool.name, status: "failure", reason });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const onSubmit = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Camera Permission Denied",
        description: "Please allow camera access to scan QR codes.",
      });
    }
    setScannerOpen(true);
  };

  if (!hasMounted) {
    return null; // or a loading spinner
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

          <ActivityLog log={log} />
        </div>
      </main>

      {isScannerOpen && (
         <QrScannerDialog
            open={isScannerOpen}
            onOpenChange={setScannerOpen}
            onScanSuccess={handleScanSuccess}
            onScanError={(error) => {
              setScannerOpen(false);
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
