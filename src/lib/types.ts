import type { z } from 'zod';

export interface School {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  fullName: string;
  schoolName: string;
  action: "check-in" | "check-out";
  status: "success" | "failure";
  reason: string;
}

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  schoolId: z.string({ required_error: "Please select a school." }),
  action: z.enum(["check-in", "check-out"], { required_error: "Please select an action." }),
});

export type FormSchemaType = z.infer<typeof formSchema>;
